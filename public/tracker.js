$(setup);
function setup() {
	$(document).delegate('#tags a', 'click', onTagClick);
	$(document).delegate('a', 'click', onLinkClick);	
	$(document).delegate('form', 'submit', onSubmit);
	$(document).delegate('article header', 'click', onHeaderClick);

	// pull!
	$.get('/items', updateList, 'json');
	$.get('/tags', updateTags, 'json');
}

function updateList(json) {
	var html = '';
	for (var i = 0; i < json.length; i++) {
		var item = json[ i ];
		html += '<article rel="' + item.id + '"><header>' + item.title + '</header><summary>' + item.body + '</summary></article>';
	}
	$('#items').html(html);
}
function updateTags(json) {
	var html = '';
	var startingSize = 10;
	for (var tag in json) {
		var a = json[ tag ];
		html += '<a href="#" rel="' + tag + '" style="font-size: ' + (startingSize + (a*2)) + 'px">' + tag + '</a> ';
	}
	$('#tags').html(html);
}

function onHeaderClick() {
	
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
function onSubmit() {
	var $form = $(this);

	if ($form.hasClass('editing')) {
		$form.find('#method').val('put');
	}

	$.post(
		$form.attr('action'),
		$form.serializeArray(),
		function(json) {
			$.get('/items', updateList, 'json');
		},
		'json'
	);

	return false;
}
