// From: http://jacwright.com/projects/javascript/date_format
// Simulates PHP's date function
Date.prototype.format=function(format){var returnStr='';var replace=Date.replaceChars;for(var i=0;i<format.length;i++){var curChar=format.charAt(i);if(i-1>=0&&format.charAt(i-1)=="\\"){returnStr+=curChar;}else if(replace[curChar]){returnStr+=replace[curChar].call(this);}else if(curChar!="\\"){returnStr+=curChar;}}return returnStr;};Date.replaceChars={shortMonths:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],longMonths:['January','February','March','April','May','June','July','August','September','October','November','December'],shortDays:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],longDays:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],d:function(){return(this.getDate()<10?'0':'')+this.getDate();},D:function(){return Date.replaceChars.shortDays[this.getDay()];},j:function(){return this.getDate();},l:function(){return Date.replaceChars.longDays[this.getDay()];},N:function(){return this.getDay()+1;},S:function(){return(this.getDate()%10==1&&this.getDate()!=11?'st':(this.getDate()%10==2&&this.getDate()!=12?'nd':(this.getDate()%10==3&&this.getDate()!=13?'rd':'th')));},w:function(){return this.getDay();},z:function(){var d=new Date(this.getFullYear(),0,1);return Math.ceil((this-d)/86400000);},W:function(){var d=new Date(this.getFullYear(),0,1);return Math.ceil((((this-d)/86400000)+d.getDay()+1)/7);},F:function(){return Date.replaceChars.longMonths[this.getMonth()];},m:function(){return(this.getMonth()<9?'0':'')+(this.getMonth()+1);},M:function(){return Date.replaceChars.shortMonths[this.getMonth()];},n:function(){return this.getMonth()+1;},t:function(){var d=new Date();return new Date(d.getFullYear(),d.getMonth(),0).getDate()},L:function(){var year=this.getFullYear();return(year%400==0||(year%100!=0&&year%4==0));},o:function(){var d=new Date(this.valueOf());d.setDate(d.getDate()-((this.getDay()+6)%7)+3);return d.getFullYear();},Y:function(){return this.getFullYear();},y:function(){return(''+this.getFullYear()).substr(2);},a:function(){return this.getHours()<12?'am':'pm';},A:function(){return this.getHours()<12?'AM':'PM';},B:function(){return Math.floor((((this.getUTCHours()+1)%24)+this.getUTCMinutes()/60+this.getUTCSeconds()/3600)*1000/24);},g:function(){return this.getHours()%12||12;},G:function(){return this.getHours();},h:function(){return((this.getHours()%12||12)<10?'0':'')+(this.getHours()%12||12);},H:function(){return(this.getHours()<10?'0':'')+this.getHours();},i:function(){return(this.getMinutes()<10?'0':'')+this.getMinutes();},s:function(){return(this.getSeconds()<10?'0':'')+this.getSeconds();},u:function(){var m=this.getMilliseconds();return(m<10?'00':(m<100?'0':''))+m;},e:function(){return"Not Yet Supported";},I:function(){return"Not Yet Supported";},O:function(){return(-this.getTimezoneOffset()<0?'-':'+')+(Math.abs(this.getTimezoneOffset()/60)<10?'0':'')+(Math.abs(this.getTimezoneOffset()/60))+'00';},P:function(){return(-this.getTimezoneOffset()<0?'-':'+')+(Math.abs(this.getTimezoneOffset()/60)<10?'0':'')+(Math.abs(this.getTimezoneOffset()/60))+':00';},T:function(){var m=this.getMonth();this.setMonth(0);var result=this.toTimeString().replace(/^.+ \(?([^\)]+)\)?$/,'$1');this.setMonth(m);return result;},Z:function(){return-this.getTimezoneOffset()*60;},c:function(){return this.format("Y-m-d\\TH:i:sP");},r:function(){return this.toString();},U:function(){return this.getTime()/1000;}};


var dateFormat = 'Y-m-d H:i:s';

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
		var when = new Date( parseInt(item.id) );
		html += '<article rel="' + item.id + '"><header>' + item.title + '</header><details>';
		if (item.tags) {
			html += item.tags.map(function(tag) {
				return '<a href="#" rel="' + tag.id + '">' + tag.name + '</a>';
			}).join(' &nbsp; ');
		}
		
		html += '<time>' + when.format( dateFormat ) + '</time>';
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

function onCreate() {
	$.post(
		'/item',
		$('#create').serializeArray(),
		function(json) {
			if (json.error) {
				alert(json.error);
			} else
				$.get('/items', updateList, 'json');
		},
		'json'
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
	var html = '<article rel="' + item.id + '"><header>' + item.title + '</header><body>' + item.body.replace(/\r\n|\r|\n/g, '<br />') + '</body></article>';
	$('#item').html(html);
}
function editItem(item) {
	var tags = '';
	if(item.tags) {
		tags = item.tags.join(' ');
	}
	var when = new Date( parseInt(item.id) );
	var html = '<form class="edit" rel="' + item.id + '"><input type="hidden" name="_method" value="post" />';
	
	html += '<input type="text" name="title" class="title" value="' + item.title + '" />';
	html += '<div class="left half"><input type="text" name="tags" class="half left" value="' + tags + '" /></div>';
	html += '<div class="right half"><input type="text" name="timestamp" value="' + when.format(dateFormat) + '" /></div>';
	html += '<textarea name="body">' + item.body + '</textarea>';
	html += '<button class="left submit">Submit</button></form><br class="clear" />';
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

/*
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
*/
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
	//}

	return false;
}
function onLinkClick() {
	return false;
}
function onSubmitClick() {
	var $form = $(this).closest('form');
	var url;

	if ($form.hasClass('editing')) {
		$form.find('#method').val('put');
	}

	if ($form.attr('rel'))
		url = '/item' + ($form.attr('rel') ? '/' + $form.attr('rel') : '');
	else
		url = '/item';

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
