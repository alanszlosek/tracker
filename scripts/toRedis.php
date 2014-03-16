<?php
include('/home/alan/coding/projects/dbFacile/dbFacile.php');
include('/home/alan/temporary/_checkouts/predis/lib/Predis.php');
$db = dbFacile::open('sqlite', '/home/alan/coding/projects/tracker.net/database/tracker.db');
$redis = new Predis\Client(); // array('database'=>2) );

$tagNoteId = microtime(true);
$tagNote = 'tag:' . $tagNoteId;
$redis->hset($tagNote, 'name', 'note');
$redis->zadd('tags.createdAt', $tagNoteId, $tagNoteId);

$rows = $db->fetchAll('select * from note order by id');
foreach($rows as $row) {
	//$a = strtotime($row['dateCreated']);
	//if (!$a)
		$a = microtime(true);
	$id = 'item:' . $a;
	
	echo $id . "\n";
	$redis->hset($id, 'title', $row['title']);
	$redis->hset($id, 'body', $row['text']);
	$redis->zadd('items.createdAt', $a, $a);

	// link to tags
	$redis->sadd('item-to-tags:' . $a, $tagNoteId);
	$redis->sadd('tag-to-items:' . $tagNoteId, $a);
}

$tagNoteId = microtime(true);
$tagNote = 'tag:' . $tagNoteId;
$redis->hset($tagNote, 'name', 'page');
$redis->zadd('tags.createdAt', $tagNoteId, $tagNoteId);

$rows = $db->fetchAll('select * from page order by id');
foreach($rows as $row) {
	//$a = strtotime($row['dateUpdated']);
	//if (!$a)
		$a = microtime(true);
	$id = 'item:' . $a;
	
	echo $id . "\n";
	$redis->hset($id, 'title', $row['title']);
	$redis->hset($id, 'body', $row['text']);
	$redis->zadd('items.createdAt', $a, $a);

	// link to tags
	$redis->sadd('item-to-tags:' . $a, $tagNoteId);
	$redis->sadd('tag-to-items:' . $tagNoteId, $a);
}


