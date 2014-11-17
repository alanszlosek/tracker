<?php
error_reporting(0);
date_default_timezone_set('America/New_York');

require('../vendor/autoload.php');

$ips = array(
);
include('../ips.php');

if (!in_array($_SERVER['REMOTE_ADDR'], $ips)) die();
if ($_SERVER['SERVER_PORT'] != 443) {
       header('Location: https://tracker.greaterscope.net');
       exit;
}

$db = \dbFacile\factory::mysqli();
$db->open('tracker', 'tracker', 'tracker', 'localhost', 'utf8');
header("Content-type: text/html; charset=utf-8");

function jsonItems($items) {
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

class Controller {
        public function four() {
                return '404';
        }
	public function index() {
		// render index template
		return file_get_contents(__DIR__ . '/views/index.html');
	}

	public function items() {
		return jsonItems( itemObjects(null, 0, 'basic') );
	}

	public function itemsOffset($params) {
		$offset = $params->offset;
		if (!$offset) $offset = 0;
		return jsonItems( itemObjects(null, $offset, 'basic') );
	}

	public function tags() {
		global $db;
		$out = array();
		$rows = $db->fetchAll('select tag,count(tag) from tags group by tag order by count(tag) desc,tag');
		foreach ($rows as $row) {
			$out[] = array_values($row);
		}
		return jsonItems($out);
	}

	public function itemIds($params) {
		global $db;
		$ids = explode(',', $params->ids);
		return jsonItems( itemObjects($ids) );
	}

	public function itemsByTags($params) {
		global $db;
		$tags = $params->tags;
		$tags = array_filter(explode(',', $tags));
		$offset = $params->offset;
		if (!$offset) $offset = 0;

		if ($tags) {
            $parts = array();
			$sql = 'SELECT item_id FROM tags';
            if ($tags) {
                $sql .= ' WHERE ';
                foreach($tags as $tag) {
                    $sql .= 'tag=';
                    $parts[] = $sql;
                    $parts[] = $tag;
                    $sql = ' OR ';
                }
                $sql = '';
            }
            $sql .= ' GROUP BY item_id HAVING count(item_id)=' . sizeof($tags);
            $parts[] = $sql;

            $ids = call_user_func_array(array($db, 'fetchColumn'), $parts);
			$rows = $db->fetchColumn('select id from items where id in ', $ids, ' order by items.createdAt');
		} else { // no tags ... pull untagged items
			$rows = $db->fetchColumn('select id from items where id not in (select distinct item_id from tags) order by items.createdAt');
		}
		if ($rows)
			return jsonItems( itemObjects($rows, $offset, 'basic') );
		else
			return '[]';
	}

	public function itemTags($params) {
		global $db;
		$ids = $params->ids;
		$rows = $db->fetchColumn('select tags.tag from tags where item_id=', $ids);
		return jsonItems($rows);
	}

	public function addItem($params) {
		$_POST = array(
			'url' => '',
			'body' => '',
			'title' => str_replace('http:/', 'http://', $params->title),
			'tags' => 'url'
		);
		$this->postItem($params);
		echo 'alert("Added");';
	}

	public function postItem($params) {
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
				$db->update('items', $data, array('id' => $id));
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

	public function deleteItem($params) {
		global $db;

		$id = $params->id;
		$tags = explode(' ', $_POST['tags']);
		$tags = array_filter($tags);

		$db->delete('items', array('id' => $id));
		$db->delete('tags', array('item_id' => $id));
		return '{}';
	}


	public function search() {
		global $db;
		$s = $_POST['title'];
		if ($s) {
			// extract tags and search those explicitly afterwards
			$result = preg_match_all('@(#[a-z0-9_-]+)@i', $s, $matches);
			$tags = $matches[1];
			// remove tags from rest of search text
			foreach ($tags as $tag) {
				$s = str_replace($tag, '', $s);
			}
			$s = trim($s); // trim out spaces

			if ($s) { // still have some text to search for
				$ids = $db->fetchColumn("select id from items where title like '%" . $s . "%' or body like '%" . $s . "%'");
			} else $ids = array();

			if ($tags) {
                $parts = array();
				$sql = 'select item_id from tags WHERE ';
				foreach($tags as $tag) {
					$sql .= 'tag=';
                    $parts[] = $sql;
                    $parts[] = substr($tag, 1);
                    $sql = ' OR ';
				}
                $sql = 'group by item_id having count(item_id)=' . sizeof($tags);
                $parts[] = $sql;
				$tagIds = call_user_func_array(array($db, 'fetchColumn'), $parts);
				if ($ids) $ids = array_intersect($ids, $tagIds);
				else $ids = $tagIds;
			}
			
			if ($ids) return jsonItems( itemObjects($ids, 0, 'basic') );
			else echo '[]';
		} else echo '[]';
	}
}


// HELPERS

function tagItemExclusively($id, $tags) {
	global $db;
	$db->execute('delete from tags where item_id=', $id);
	tagItem($id, $tags);
	return true;
}
function tagItem($id, $tags) {
	global $db;

    // Enforce use of certain tags
    $converge = array(
        'book' => 'books',
        'computerscience' => 'computer-science',
        'operatingsystems' => 'operating-systems',
        'videos' => 'video'
    );

	$tags = array_unique($tags);
	foreach($tags as $tag) {
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

function itemObject($id) {
	global $db;
	$row = $db->fetchRow('select * from items where id=', $id);
	$row['tags'] = $db->fetchColumn('select tag from tags where item_id=', $id);
	return $row;
}

function itemObjects($ids = array(), $offset = 0, $fields = null) {
	global $db;

	if (!$fields) $fields = '*';
	elseif ($fields == 'basic') $fields = 'id,title,createdAt';

    $parts = array();
	$sql = 'SELECT ' . $fields . ' FROM items';
    if ($ids) {
        $sql .= ' WHERE ';
        foreach($ids as $id) {
            $sql .= 'id=';
            $parts[] = $sql;
            $parts[] = $id;
            $sql = ' OR ';
        }
        $sql = '';
    }
    $sql .= ' ORDER BY createdAt desc limit ' . ($offset ? $offset . ',' : '') . '20';
    $parts[] = $sql;

	$rows = call_user_func_array(array($db, 'fetchAll'), $parts);
	foreach ($rows as $i => &$row) {
		$row['tags'] = $db->fetchColumn('select tag from tags where item_id=', $row['id'], ' order by tag');
	}
	return $rows;
}

function extractTitle($url) {
	$html = file_get_contents($url);
	if ($html) {
		$xml = new DOMDocument();
		if( $xml->loadHTML($html) ) {
			$x = simplexml_import_dom($xml);
			$a = $x->xpath('//head/title');
			return trim(strval($a[0]));
		}
	}
	return '';
}

echo $routes->dispatch($_GET['uri']);
