<?php
include('../lib.php/dbFacile/dbFacile.php');
$db = dbFacile::open('sqlite', '/home/switchprog/tracker.net/database/tracker.db');
$db2 = dbFacile::open('mysql', 'tracker', 'tracker', 'tracker');

$rows = $db->fetchAll('select * from note order by id');
foreach($rows as $row) {
	$a = strtotime($row['dateUpdated']) * 1000;

	$data = array(
		'title' => $row['title'],
		'body' => $row['text'],
		'createdAt' => $a
	);
	$id = $db2->insert($data, 'items');

	$data = array(
		'tag' => 'note',
		'item_id' => $id
	);
	$db2->insert($data, 'tags');
}

$rows = $db->fetchAll('select * from page order by id');
foreach($rows as $row) {
	$b = strtotime($row['dateUpdated']) * 1000;

	$data = array(
		'title' => $row['title'],
		'body' => $row['text'],
		'createdAt' => $b,
		'updatedAt' => $b
	);
	$id = $db2->insert($data, 'items');

	$data = array(
		'tag' => 'page',
		'item_id' => $id
	);
	$db2->insert($data, 'tags');
}

