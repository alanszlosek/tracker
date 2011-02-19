<?php
if ($_SERVER['REMOTE_ADDR'] != '184.76.70.24') die();
// include dbFacile
include('lib.php/limonade/lib/limonade.php');
include('lib.php/dbFacile/dbFacile.php');

$db = dbFacile::open('mysql', 'tracker', 'tracker', 'tracker');

/*
var_dump($_GET);
exit;
*/

/*
class Route() {
	protected static $urls = array();
	protected static $get = array();
	protected static $post = array();

	public function add($type, $url, $callback) {
		Route::prepareUrl($url);
		if ($type == 'get')
			Route::$get[$url] = $callback;
	}

	public function run() {
		$method = $_SERVER['HTTP_METHOD'];
		
		if ($method == 'POST') $which = Route::$post;
		elseif ($method == 'GET') $which = Route::$get;

		$keys = array_keys($which);

		
	}

	protected prepareUrl($url) {
		// escape and convert to regex
		// keeping named placeholders

		// split on slash ... then split real urls on slash, compare sizes
		// bah
		// not using named params ... in favor of asterisk placeholders that result in numeric matches is easier
		// replace * with ([a-z]+) and then return $matches[2] or 3, whichever holds the parenthesized matches
	}
}
*/

function get($url, $callback) {
	dispatch_get($url, $callback);
}
function post($url, $callback) {
	dispatch_post($url, $callback);
}

function jsonItems($items) {
	// return error or array of items
	return json_encode($items);
}

get('/', 'getIndex');
function getIndex() {
	// render index template
	return file_get_contents('/home/switchprog/tracker2.net/views/index.html');
}

get('/items', 'getAllItems');
function getAllItems() {
	return jsonItems( itemObjects(null, true, 'basic') );
}

get('/tags', 'getTags');
function getTags() {
	global $db;
	$rows = $db->fetchColumn('select distinct tag from tags order by tag');
	return jsonItems($rows);
}

get('/items/:ids', 'getItems');
function getItems() {
	global $db;
	$ids = explode(',', params('ids'));
	return jsonItems( itemObjects($ids) );
}

get('/items-by-tags/:tags', 'getItemsByTags');
function getItemsByTags() {
	global $db;
	$tags = explode(',', params('tags'));
	$where = array();
	foreach($tags as $tag) {
		$where[] = "tags.tag='" . $tag . "'";
	}
	// group by stuff
	$rows = $db->fetchColumn('select items.id from items inner join tags on (tags.item_id=items.id) where ' . implode(' or ', $where) . ' order by items.createdAt');
	return jsonItems( itemObjects($rows, false, 'basic') );
}

get('/items/:ids/tags', 'getTagsForItems');
function getTagsForItems() {
	global $db;
	$rows = $db->fetchColumn('select tags.tag from tags where item_id=?', array(params('ids')));
	return jsonItems($rows);
}

post('/item', 'postItem');
post('/item/:id', 'postItem');
function postItem() {
	global $db;

	$id = params('id');
	$tags = explode(' ', $_POST['tags']);
/*
	$tags = array_map(
			'trim',
			explode(',', $_POST['tags'])
		);
*/

	$data = array(
		'title' => $_POST['title'],
		'body' => $_POST['body'],
		'url' => $_POST['url']
	);
	if ($id) {

		if ($_POST['delete']) {
			$db->execute('delete from items where id=?', array($id));
			$db->execute('delete from tags where item_id=?', array($id));
			return '{}';
		} else {
			$data['updatedAt'] = time() * 1000;
			$db->update($data, 'items', 'id=?', array($id));
		}
	} else {
		$data['createdAt'] = time() * 1000;
		$id = $db->insert($data, 'items');
	}
	tagItemExclusively($id, $tags);
	return jsonItems( itemObject($id) );
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

function itemObjects($ids = array(), $limit = true, $fields = null) {
	global $db;

	if (!$fields) $fields = '*';
	elseif ($fields == 'basic') $fields = 'id,title,createdAt';

	$where = array();
	if (!$ids) $where[] = '1=1'; // get all
	foreach($ids as $a) {
		$where[] = "id='" . $a . "'";
	}
	$rows = $db->fetchAll('select ' . $fields . ' from items where ' . implode(' or ', $where) . ' order by createdAt desc' . ($limit ? ' limit 10' : ''));
	foreach ($rows as $i => &$row) {
		$row['tags'] = $db->fetchColumn('select tag from tags where item_id=? order by tag', array($row['id']));
	}
	return $rows;
}


run();
