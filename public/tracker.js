function returnFalse() {
	return false;
}
$(setup);
function setup() {
	$(document).delegate('#tags a', 'click', onTagClick);
	$(document).delegate('form', 'submit', returnFalse);
	$(document).delegate('a', 'click', onLinkClick);	
	$(document).delegate('article header', 'click', onHeaderClick);
	$(document).delegate('button.cancel', 'click', onCancelClick);
	$(document).delegate('button.submit', 'click', onSubmitClick);

	// pull!
	$.get('/items', updateList, 'json');
	$.get('/tags', updateTags, 'json');
}

function updateList(json) {
	var html = '';
	for (var i = 0; i < json.length; i++) {
		var item = json[ i ];
		html += '<article rel="' + item.id + '"><header>' + item.title + '</header><summary>' + item.body + '</summary><details>' + (item.tags ? item.tags.join(', ') : '') + '</details></article><hr />';
	}
	$('#items').html(html);
}
function updateTags(json) {
	var html = '';
	var startingSize = 10;
	for (var i = 0; i < json.length; i++) {
		var tag = json[ i ];
		//html += '<a href="#" rel="' + tag + '" style="font-size: ' + (startingSize + (a*2)) + 'px">' + tag + '</a> ';
		html += '<a href="#" rel="' + tag + '">' + tag + '</a> ';
	}
	$('#tags').html(html);
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
function onTagClick() {
	var $el = $(this);
	var href = $el.attr('href');
	// what state are we in?
	// filter by tag, or add/remove tag from item we're editing?
	if(1) { // filtering
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
			$.get('/items/tags/' + tags.join('+'), updateList);
		}
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
