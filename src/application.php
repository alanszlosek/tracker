<?php
error_reporting(0);
date_default_timezone_set('America/New_York');

require '../vendor/autoload.php';

$db = \dbFacile\factory::sqlite3();
$db->open('../database/tracker.sqlite3');

header("Content-type: text/html; charset=utf-8");

function jsonItems($items)
{
    // return error or array of items
    return json_encode($items);
}

$routes = new TinyHelpers\Route(array(
    '__to' => 'Controller->index',
    'items' => array(
        '__to' => 'Controller->items',
        ':string' => array(
            '__to' => 'Controller->itemIds',
            '__label' => 'ids',
            ':string' => array(
                '__to' => 'Controller->itemTags',
                '__label' => 'ids'
            )
        )
    ),

    'items-offset' => array(
        ':integer' => array(
            '__to' => 'Controller->itemsOffset',
            '__label' => 'offset'
        )
    ),

    'items-by-tags' => array(
        ':string' => array(
            '__to' => 'Controller->itemsByTags',
            '__label' => 'tags',
            ':integer' => array(
                '__to' => 'Controller->itemsByTags',
                '__label' => 'offset'
            )
        )
    ),

    'item' => array(
        '__to' => 'Controller->postItem',
        ':integer' => array(
            '__to' => 'Controller->postItem',
            '__label' => 'id',
            'delete' => array(
                '__to' => 'Controller->deleteItem'
            )
        )
    ),

    'tags' => array(
        '__to' => 'Controller->tags'
    ),

    'add' => array(
        ':string' => array(
            '__to' => 'Controller->addItem',
            '__label' => 'title'
        )
    ),
    'search' => array(
        '__to' => 'Controller->search'
    )
));

class QueryHelper {
    protected $parts = array();
    protected $string = '';
    public function sql($value) {
        $this->string .= $value;
    }
    public function value($value) {
        if ($this->string) {
            $this->parts[] = $this->string;
            $this->string = '';
        }
        $this->parts[] = $value;
    }

    public function get() {
        if ($this->string) {
            $this->parts[] = $this->string;
            $this->string = '';
        }
        return $this->parts;
    }
}

class Controller
{
    public function four()
    {
        return '404';
    }
    public function index()
    {
        // render index template
        return file_get_contents(__DIR__ . '/views/index.html');
    }

    public function items()
    {
        return jsonItems( itemObjects(null, 0, 'basic') );
    }

    public function itemsOffset($params)
    {
        $offset = $params->offset;
        if (!$offset) $offset = 0;
        return jsonItems( itemObjects(null, $offset, 'basic') );
    }

    public function tags()
    {
        global $db;
        $out = array();
        $rows = $db->fetchAll('select tag,count(tag) from tags group by tag order by count(tag) desc,tag');
        foreach ($rows as $row) {
            $out[] = array_values($row);
        }

        return jsonItems($out);
    }

    public function itemIds($params)
    {
        global $db;
        $ids = explode(',', $params->ids);

        return jsonItems( itemObjectsByIds($ids) );
    }

    public function itemsByTags($params)
    {
        global $db;
        $tags = $params->tags;
        $tags = array_filter(explode(',', $tags));
        $offset = $params->offset;
        if (!$offset) $offset = 0;

        $query = new QueryHelper();
        if ($tags) {
            $numTags = sizeof($tags);
            $query->sql(' WHERE id IN (SELECT item_id FROM tags WHERE tag=');
            while ($tag = array_shift($tags)) {
                $query->value($tag);
                if ($tags) {
                    $query->sql(' OR tag=');
                }
            }
            $query->sql(' GROUP BY item_id HAVING count(item_id)=' . $numTags . ')');

        } else { // no tags ... pull untagged items
            $query->sql('SELECT id FROM items WHERE id NOT IN (select distinct item_id from tags)');
        }
        return jsonItems( itemObjects($query->get(), $offset, 'basic') );
    }

    public function itemTags($params)
    {
        global $db;
        $ids = $params->ids;
        $rows = $db->fetchColumn('select tags.tag from tags where item_id=', $ids);

        return jsonItems($rows);
    }

    public function addItem($params)
    {
        $_POST = array(
            'url' => '',
            'body' => '',
            'title' => str_replace('http:/', 'http://', $params->title),
            'tags' => 'url'
        );
        return $this->postItem($params);
    }

    public function postItem($params)
    {
        global $db;

        $id = $params->id;
        $tags = explode(' ', $_POST['tags']);
        $tags = array_filter($tags);

        $data = array(
            'title' => trim($_POST['title']),
            'body' => $_POST['body'],
            'url' => $_POST['url']
        );
        if ($id) {
            if ($_POST['delete']) {
                $db->execute('delete from items where id=', $id);
                $db->execute('delete from tags where item_id=', $id);

                return '{}';
            } else {
                if (strlen($_POST['createdAt'])) {
                    $data['createdAt'] = strtotime($_POST['createdAt']) * 1000;
                }
                $data['updatedAt'] = time() * 1000;
                $res = $db->update('items', $data, array('id' => $id));
            }
        } else {
            if (substr($data['title'], 0, 4) == 'http') {
                $data['url'] = $data['title'];
                $data['title'] = extractTitle($data['url']);
                if (!$data['title']) $data['title'] = 'oops';
                $tags[] = 'url';
            } else {
                if (preg_match('/^\w+$/i', $data['title'])) {
                    $tags[] = $data['title'];
                }
            }
            $data['createdAt'] = time() * 1000;
            $id = $db->insert('items', $data);
        }
        tagItemExclusively($id, $tags);

        return jsonItems( itemObject($id) );
    }

    public function deleteItem($params)
    {
        global $db;

        $id = $params->id;
        $tags = explode(' ', $_POST['tags']);
        $tags = array_filter($tags);

        $db->delete('items', array('id' => $id));
        $db->delete('tags', array('item_id' => $id));

        return '{}';
    }

    public function search()
    {
        global $db;
        $s = $_POST['title'];
        if (!$s) {
            return '[]';
        }
        // extract tags and search those explicitly afterwards
        $result = preg_match_all('@(#[a-z0-9_-]+)@i', $s, $matches);
        $tags = $matches[1];
        // remove tags from rest of search text
        foreach ($tags as $tag) {
            $s = str_replace($tag, '', $s);
        }
        $s = trim($s); // trim out spaces

        if ($s) { // still have some text to search for
            $ids = $db->fetchColumn("select id from items where title like '%" . $s . "%' or body like '%" . $s . "%' or url like '%" . $s . "%'");
        } else $ids = array();

        if ($tags) {
            $query = new QueryHelper();
            $query->sql('select item_id from tags WHERE tag=');
            $numTags = sizeof($tags);
            while ($tag = array_shift($tags)) {
                $query->value(substr($tag, 1));
                if ($tags) {
                    $query->sql(' OR tag=');
                }
            }
            $query->sql('group by item_id having count(item_id)=' . $numTags);
            $tagIds = call_user_func_array(array($db, 'fetchColumn'), $query->get());
            if ($ids) $ids = array_intersect($ids, $tagIds);
            else $ids = $tagIds;
        }

        if ($ids) {
            return jsonItems( itemObjectsByIds($ids, 0, 'basic') );
        }
        return '[]';
    }
}

// HELPERS

function tagItemExclusively($id, $tags)
{
    global $db;
    $db->execute('delete from tags where item_id=', $id);
    tagItem($id, $tags);

    return true;
}
function tagItem($id, $tags)
{
    global $db;

    // Enforce use of certain tags
    $converge = array(
        'book' => 'books',
        'computerscience' => 'computer-science',
        'operatingsystems' => 'operating-systems',
        'videos' => 'video',
        'project' => 'projects'
    );

    $tags = array_unique($tags);
    foreach ($tags as $tag) {
        if (isset($converge[$tag])) {
            $tag = $converge[$tag];
        }
        $data = array(
            'tag' => $tag,
            'item_id' => $id
        );
        $db->insert('tags', $data);
    }

    return true;
}

function itemObject($id)
{
    global $db;
    $row = $db->fetchRow('select * from items where id=', $id);
    $row['tags'] = $db->fetchColumn('select tag from tags where item_id=', $id);

    return $row;
}

function itemObjectsByIds($ids = array(), $offset = 0, $fields = null)
{
    $parts = array();
    $parts[] = ' WHERE id IN ';
    $parts[] = $ids;
    $parts[] = '';

    return itemObjects($parts, $offset, $fields);
}

function itemObjects($parts = array(), $offset = 0, $fields = null)
{
    global $db;

    if (!$fields) $fields = '*';
    elseif ($fields == 'basic') $fields = 'id,title,createdAt';

    // Prepend onto beginning of where clause
    if ($parts) {
        $parts[0] = 'SELECT ' . $fields . ' FROM items' . $parts[0];
        $sql = array_pop($parts);
    } else {
        $sql = 'SELECT ' . $fields . ' FROM items';
    }
    $sql .= ' ORDER BY createdAt desc limit ' . ($offset ? $offset . ',' : '') . '20';
    $parts[] = $sql;

    $rows = call_user_func_array(array($db, 'fetchAll'), $parts);
    foreach ($rows as $i => &$row) {
        $row['tags'] = $db->fetchColumn('select tag from tags where item_id=', $row['id'], ' order by tag');
    }

    return $rows;
}

function extractTitle($url)
{
    $html = file_get_contents($url);
    if ($html) {
        $xml = new DOMDocument();
        if ( $xml->loadHTML($html) ) {
            $x = simplexml_import_dom($xml);
            $a = $x->xpath('//head/title');

            return trim(strval($a[0]));
        }
    }

    return '';
}

echo $routes->dispatch($_GET['uri']);
