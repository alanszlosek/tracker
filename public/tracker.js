$(setup);
function setup() {
	$(document).delegate('#tags a', 'click', onTagClick);
	$(document).delegate('a', 'click', onLinkClick);	

	// pull!
	$.get('/items', updateList, 'json');
}

function updateList(json) {
	
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
