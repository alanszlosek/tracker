function returnFalse() {
	return false;
}
$(setup);
function setup() {
	$(document).delegate('#tags a', 'click', onTagClick);
	$(document).delegate('form', 'submit', returnFalse);
	//$(document).delegate('a', 'click', onLinkClick);	
	//$(document).delegate('article header', 'click', onHeaderClick);
	//$(document).delegate('button.cancel', 'click', onCancelClick);
	$(document).delegate('button.submit', 'click', onSubmitClick);
	$(document).delegate('#newTag button', 'click', onTagSubmit);


	$('#items').delegate('article', 'click', onItemClick);

	// pull!
	$.get('/items', updateList, 'json');
	$.get('/tags', updateTags, 'json');
}

function updateList(json) {
	var html = '';
	for (var i = 0; i < json.length; i++) {
		var item = json[ i ];
		html += '<article rel="' + item.id + '"><header>' + item.title + '</header><details>';
		if (item.tags) {
			html += item.tags.map(function(tag) {
				return '<a href="#" rel="' + tag.id + '">' + tag.name + '</a>';
			}).join(' &nbsp; ');
		}
		html += '</details></article>';
	}
	$('#items').html(html);
}
function updateTags(json) {
	var html = '';
	var startingSize = 10;
	for (var i = 0; i < json.length; i++) {
		var tag = json[ i ];
		//html += '<a href="#" rel="' + tag + '" style="font-size: ' + (startingSize + (a*2)) + 'px">' + tag + '</a> ';
		html += '<li><a href="#" rel="' + tag.id + '">' + tag.name + '</a></li>';
	}
	$('#tags').html(html);
}
function updateArticleTags(json) {
	for (var i in json) {
		var tags = json[i];
		var html = tags.map(function(tag) {
			return '<a href="#" rel="' + tag.id + '">' + tag.name + '</a>';
		}).join(', ');
		$('article[rel=' + i + '] details').html(html);
	}
}

function onHeaderClick() {
	var $el = $(this).closest('article');
	$el.hide();
	$.get(
		'/form',
		function(html) {
			$el.after(html);
			var $form = $el.next();
			$form.addClass('editing').attr('rel', $el.attr('rel'));
			$form.find('.title').val($el.find('header').html());
			$form.find('.tags').val($el.find('details').html());
			$form.find('textarea').val($el.find('summary').html());
		}
	);
}

function onItemClick() {
	var $article = $(this);
	if ($article.hasClass('selected')) { // already been clicked, start editing
		getItem($article.attr('rel'), editItem);

	} else {
		$('#items article').removeClass('selected');
		$article.addClass('selected');
		getItem($article.attr('rel'), viewItem);
	}
}

function getItem(ids, callback) {
	$.get('/items/' + ids, function(json) {
		callback(json[0]);
	},'json');
}

function viewItem(item) {
	var html = '<article rel="' + item.id + '"><header>' + item.title + '</header><body>' + item.body + '</body></article>';
	$('#item').html(html);
}
function editItem(item) {
	var html = '<form><input type="hidden" name="_method" value="post" /><input type="text" name="title" class="title" value="' + item.title + '" /><textarea name="body">' + item.body + '</textarea><button class="left submit">Submit</button></form><br class="clear" />';
	$('#item').html(html);
}

/*
function onItemClick() {
	var $article = $(this);
	var $articleTags = $article.find('details a');
	var $tags = $('#tags');
	// select tags found in this item
	if ($article.hasClass('selected')) {
		$article.removeClass('selected');
		$articleTags.each(function() {
			$tags.find('[rel=' + $(this).attr('rel') + ']').removeClass('selected');
		});
	} else {
		$article.addClass('selected');
		$articleTags.each(function() {
			$tags.find('[rel=' + $(this).attr('rel') + ']').addClass('selected');
		});
	}
}
*/
function onTagClick() {
	// how can i trigger this with the 'select none' tag link?
	var $el = $(this);
	var href = $el.attr('href');
	var tag = $el.attr('rel');
	var $selected = $('article.selected');
	// what state are we in?
	// filter by tag, or add/remove tag from item we're editing?
	if($selected.length) {
		var ids = $.map($selected, function(el) { return $(el).attr('rel'); });
		if ($el.hasClass('selected')) {
			$.post('/items/' + ids.join(',') + '/untag/' + tag, updateArticleTags, 'json');
			$el.removeClass('selected');
		} else {
			$.post('/items/' + ids.join(',') + '/tag/' + tag, updateArticleTags, 'json');
			$el.addClass('selected');
		}
	} else { // filtering
		if ($el.hasClass('selected')) {
			$el.removeClass('selected');
		} else {
			$el.addClass('selected');
		}
		var tags = [];
		$('#tags a.selected').each(function() {
			tags.push( $(this).attr('rel') );
		});
		if (tags.length) {
			// update listview
			$.get('/items-by-tags/' + tags.join(','), updateList, 'json');
		} else
			$.get('/items', updateList, 'json');
	}

	return false;
}
function onLinkClick() {
	return false;
}
function onSubmitClick() {
	var $form = $(this).closest('form');

	if ($form.hasClass('editing')) {
		$form.find('#method').val('put');
	}

	$.post(
		'/item' + ($form.attr('rel') ? '/' + $form.attr('rel') : ''),
		$form.serializeArray(),
		function(json) {
			if (json.success == true) {
				/*
				if ('id' in json) {
				} else {
				*/
				//}
			} else {
			}
			$.get('/items', updateList, 'json');
			$form.find(':text,textarea').val('');
		},
		'json'
	);

	return false;
}
function onCancelClick() {
	var $form = $(this).closest('form');
	// if editing an item, not creating a new one
	if ($form.closest('#items')) {
		$form.prev().show();
		$form.remove();
	}
	return false;
}
function onTagSubmit() {
	var $form = $(this).closest('form');

	$.post(
		'/tag',
		$form.serializeArray(),
		function(json) {
			if (json.success == true) {
				$form.find('input').val('');
				/*
				if ('id' in json) {
				} else {
				*/
				//}
			} else {
			}
			$.get('/tags', updateTags, 'json');
		},
		'json'
	);

	return false;
}
