<?php
error_reporting(0);

$ips = array(
);
include('ips.php');
if (!in_array($_SERVER['REMOTE_ADDR'], $ips)) die();
// include dbFacile
//include('lib.php/limonade/lib/limonade.php');
include('lib.php/dbFacile/dbFacile.php');
include('lib/Route.php');

$db = dbFacile::open('mysql', 'tracker', 'tracker', 'tracker');
mysql_set_charset('utf8');
header("Content-type: text/html; charset=utf-8");

function jsonItems($items) {
	// return error or array of items
	return json_encode($items);
}

$routes = array(
	'' => Route::To('Controller', 'index'),
	'items' => array(
		'' => Route::To('Controller', 'items'),
		'"' => array(
			'' => Route::To('Controller', 'itemIds'),
			'"' => Route::To('Controller', 'itemTags'),
		)
	),
	'items-offset' => Route::To('Controller', 'itemsOffset'),
	'items-by-tags' => Route::To('Controller', 'itemsByTags'),
	'item' => array(
		'' => Route::To('Controller', 'postItem'),
		'#' => array(
			'' => Route::To('Controller', 'postItem'),
			'delete' => Route::To('Controller', 'deleteItem'),
		)
	),
	'tags' => array(
		'' => Route::To('Controller', 'tags'),
	),
	'add' => array(
		'"' => Route::To('Controller', 'addItem'),
	),
	'search' => Route::To('Controller', 'search')
);

class Controller {
        public function four($path) {
                return '404';
        }
	public function index() {
		// render index template
		return file_get_contents('/home/alan/_tracker.net/views/index.html');
	}

	public function items($path) {
		return jsonItems( itemObjects(null, 0, 'basic') );
	}

	public function itemsOffset($path) {
		$offset = $path[1];
		if (!$offset) $offset = 0;
		return jsonItems( itemObjects(null, $offset, 'basic') );
	}

	public function tags() {
		global $db;
		$out = array();
		$rows = $db->fetchColumn('select tag as num from tags group by tag order by count(tag) desc,tag');
		return jsonItems($rows);
		foreach ($rows as $row) {
			$out[] = array_values($row);
		}
		return jsonItems($out);
	}

	public function itemIds($path) {
		global $db;
		$ids = explode(',', $path[1]);
		return jsonItems( itemObjects($ids) );
	}

	public function itemsByTags($path) {
		global $db;
		$tags = $path[1];
		$tags = array_filter(explode(',', $tags));
		$offset = $path[2];
		if (!$offset) $offset = 0;
		$where = array();
		foreach($tags as $tag) {
			$where[] = "tag='" . $tag . "'";
		}
		// group by stuff
		if ($where) {
			$ids = $db->fetchColumn('select item_id from tags where ' . implode(' or ', $where) . ' group by item_id having count(item_id)=' . sizeof($where));
			$rows = $db->fetchColumn('select id from items where id in (' . implode(',', $ids) . ') order by items.createdAt');
		} else { // no tags ... pull untagged items
			$rows = $db->fetchColumn('select id from items where id not in (select distinct item_id from tags) order by items.createdAt');
		}
		if ($rows)
			return jsonItems( itemObjects($rows, $offset, 'basic') );
		else
			return '[]';
	}

	public function itemTags($path) {
		global $db;
		$ids = $path[1];
		$rows = $db->fetchColumn('select tags.tag from tags where item_id=?', array($ids));
		return jsonItems($rows);
	}

	public function addItem($path) {
		$_POST = array(
			'url' => '',
			'body' => '',
			'title' => str_replace('http:/', 'http://', $path[1]),
			'tags' => 'url'
		);
		$this->postItem($path);
		echo 'alert("Added");';
	}

	public function postItem($path) {
		global $db;

		$id = $path[1];
		$tags = explode(' ', $_POST['tags']);
		$tags = array_filter($tags);

		$data = array(
			'title' => trim($_POST['title']),
			'body' => $_POST['body'],
			'url' => $_POST['url']
		);
		if ($id) {
			if ($_POST['delete']) {
				$db->execute('delete from items where id=?', array($id));
				$db->execute('delete from tags where item_id=?', array($id));
				return '{}';
			} else {
				if (strlen($_POST['createdAt'])) {
					$data['createdAt'] = strtotime($_POST['createdAt']) * 1000;

				}
				$data['updatedAt'] = time() * 1000;
				$db->update($data, 'items', 'id=?', array($id));
			}
		} else {
			if (substr($data['title'], 0, 4) == 'http') {
				$data['url'] = $data['title'];
				$data['title'] = extractTitle($data['url']);
				if (!$data['title']) $data['title'] = 'oops';
				$tags[] = 'url';
			}
			$data['createdAt'] = time() * 1000;
			$id = $db->insert($data, 'items');
		}
		tagItemExclusively($id, $tags);
		return jsonItems( itemObject($id) );
	}

	public function deleteItem($path) {
		global $db;

		$id = $path[1];
		$tags = explode(' ', $_POST['tags']);
		$tags = array_filter($tags);

		$db->delete('items', 'id=?', array($id));
		$db->delete('tags', 'item_id=?', array($id));
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
				$where = array();
				foreach($tags as $tag) {
					$where[] = "tag='" . substr($tag, 1) . "'";
				}
				// group by stuff
				$tagIds = $db->fetchColumn('select item_id from tags where ' . implode(' or ', $where) . ' group by item_id having count(item_id)=' . sizeof($where));
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
	$db->execute('delete from tags where item_id=?', array($id));
	tagItem($id, $tags);
	return true;
}
function tagItem($id, $tags) {
	global $db;
	$tags = array_unique($tags);
	foreach($tags as $tag) {
		$data = array(
			'tag' => $tag,
			'item_id' => $id
		);
		$db->insert($data, 'tags');
	}
	return true;
}

function itemObject($id) {
	global $db;
	$row = $db->fetchRow('select * from items where id=?', array($id));
	$row['tags'] = $db->fetchColumn('select tag from tags where item_id=?', array($id));
	return $row;
}

function itemObjects($ids = array(), $offset = 0, $fields = null) {
	global $db;

	if (!$fields) $fields = '*';
	elseif ($fields == 'basic') $fields = 'id,title,createdAt';

	$where = array();
	if (!$ids) $where[] = '1=1'; // get all
	foreach($ids as $a) {
		$where[] = "id='" . $a . "'";
	}
	$rows = $db->fetchAll('select ' . $fields . ' from items where ' . implode(' or ', $where) . ' order by createdAt desc limit ' . ($offset ? $offset . ',' : '') . '20');
	foreach ($rows as $i => &$row) {
		$row['tags'] = $db->fetchColumn('select tag from tags where item_id=? order by tag', array($row['id']));
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


$path = explode('/', substr($_GET['uri'], 1));
unset($_GET['uri']);
$r = new Route($routes);
echo $r->dispatch($path);
