<?php
// include dbFacile
include('/home/sandbox/checkouts/limonade/lib/limonade.php');
include('/home/sandbox/checkouts/limonade/lib/limonade.php');

$db = dbFacile::open('mysql', 'tracker', 'tracker', 'tracker');

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
	F3:dispatch_get($url, $callback);
}
function post($url, $callback) {
	F3:dispatch_post($url, $callback);
}

function jsonItems($items) {
	// return error or array of items
}

get('/', 'getIndex');
function getIndex() {
	// render index template
	html('index.html');
}

get('/items', 'getAllItems');
function getAllItems() {
	global $db;
	$rows = $db->fetchRows('select * from items order by createdAt desc limit 10');
	return jsonItems($rows);
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
	$ids = params('ids');
	$rows = $db->fetchRows('select * from items where id in (' . implode(',',$ids) . ') order by createdAt desc limit 10');
	return jsonItems($rows);
}

get('/items-by-tags/:tags', 'itemsByTags');
function getItemsByTags() {
	global $db;
	$tags = params('tags');
	$where = array();
	foreach($tags as $tag) {
		$where[] = "tags.tag='" . $tag . "'";
	}
	$rows = $db->fetchRows('select items.* from items inner join tags on (tags.item_id=items.id) where ' . implode(' or ', $tags) . ' order by createdAt desc limit 10');
	return jsonItems($rows);
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
	$tags = array_map(
			explode(',', params('tags')),
			'trim'
		);

	if ($id) {
		$data = array(
			'title' => params('title'),
			'body' => params('body')
		);
		$db->update($data, 'items', 'id=?', array($id));
	} else {
		$at = date('Y-m-d H:i:s');

		$id = $db->insert($data, 'items');
	}
	tagItemExclusively($id, $tags);
	return itemObject($id);
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
	$row['tags'] = $db->fetchColum('select tag from tags where item_id=?', array($id));
	return $row;
}
