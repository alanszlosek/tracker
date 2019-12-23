// From: http://jacwright.com/projects/javascript/date_format
// Simulates PHP's date function
Date.prototype.format=function(format){var returnStr='';var replace=Date.replaceChars;for(var i=0;i<format.length;i++){var curChar=format.charAt(i);if(i-1>=0&&format.charAt(i-1)=="\\"){returnStr+=curChar;}else if(replace[curChar]){returnStr+=replace[curChar].call(this);}else if(curChar!="\\"){returnStr+=curChar;}}return returnStr;};Date.replaceChars={shortMonths:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],longMonths:['January','February','March','April','May','June','July','August','September','October','November','December'],shortDays:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],longDays:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],d:function(){return(this.getDate()<10?'0':'')+this.getDate();},D:function(){return Date.replaceChars.shortDays[this.getDay()];},j:function(){return this.getDate();},l:function(){return Date.replaceChars.longDays[this.getDay()];},N:function(){return this.getDay()+1;},S:function(){return(this.getDate()%10==1&&this.getDate()!=11?'st':(this.getDate()%10==2&&this.getDate()!=12?'nd':(this.getDate()%10==3&&this.getDate()!=13?'rd':'th')));},w:function(){return this.getDay();},z:function(){var d=new Date(this.getFullYear(),0,1);return Math.ceil((this-d)/86400000);},W:function(){var d=new Date(this.getFullYear(),0,1);return Math.ceil((((this-d)/86400000)+d.getDay()+1)/7);},F:function(){return Date.replaceChars.longMonths[this.getMonth()];},m:function(){return(this.getMonth()<9?'0':'')+(this.getMonth()+1);},M:function(){return Date.replaceChars.shortMonths[this.getMonth()];},n:function(){return this.getMonth()+1;},t:function(){var d=new Date();return new Date(d.getFullYear(),d.getMonth(),0).getDate()},L:function(){var year=this.getFullYear();return(year%400==0||(year%100!=0&&year%4==0));},o:function(){var d=new Date(this.valueOf());d.setDate(d.getDate()-((this.getDay()+6)%7)+3);return d.getFullYear();},Y:function(){return this.getFullYear();},y:function(){return(''+this.getFullYear()).substr(2);},a:function(){return this.getHours()<12?'am':'pm';},A:function(){return this.getHours()<12?'AM':'PM';},B:function(){return Math.floor((((this.getUTCHours()+1)%24)+this.getUTCMinutes()/60+this.getUTCSeconds()/3600)*1000/24);},g:function(){return this.getHours()%12||12;},G:function(){return this.getHours();},h:function(){return((this.getHours()%12||12)<10?'0':'')+(this.getHours()%12||12);},H:function(){return(this.getHours()<10?'0':'')+this.getHours();},i:function(){return(this.getMinutes()<10?'0':'')+this.getMinutes();},s:function(){return(this.getSeconds()<10?'0':'')+this.getSeconds();},u:function(){var m=this.getMilliseconds();return(m<10?'00':(m<100?'0':''))+m;},e:function(){return"Not Yet Supported";},I:function(){return"Not Yet Supported";},O:function(){return(-this.getTimezoneOffset()<0?'-':'+')+(Math.abs(this.getTimezoneOffset()/60)<10?'0':'')+(Math.abs(this.getTimezoneOffset()/60))+'00';},P:function(){return(-this.getTimezoneOffset()<0?'-':'+')+(Math.abs(this.getTimezoneOffset()/60)<10?'0':'')+(Math.abs(this.getTimezoneOffset()/60))+':00';},T:function(){var m=this.getMonth();this.setMonth(0);var result=this.toTimeString().replace(/^.+ \(?([^\)]+)\)?$/,'$1');this.setMonth(m);return result;},Z:function(){return-this.getTimezoneOffset()*60;},c:function(){return this.format("Y-m-d\\TH:i:sP");},r:function(){return this.toString();},U:function(){return this.getTime()/1000;}};


var dateFormat = 'Y-m-d H:i:s';
var currentPrefix = '/items-offset/';
var offset = 0;

function returnFalse() {
    return false;
}
$(function() {
    var $processing = $('#processing');
    //$(window).bind('resize', setSizes);
    $('#tags').on('click', 'a.tag', onTagClick);
    $('#tags').on('click', 'a.tag2', onTagClick2);
    $('#items').on('click', 'a.tag', onItemTagClick);
    $('#items').on('click', 'article.more', onMoreClick);
    $(document).on('click', '.submit', onSubmitClick);
    $(document).on('click', '.search', onSearchClick);
    $('#item').on('click', '.delete', onDeleteClick);
    $('.items').on('click', 'article', onItemClick);


    $(document)
        .ajaxStart(function() {
            $processing.show();
        })
        .ajaxStop(function() {
            $processing.hide();
        });

    // pull!
    $.get('/api/items', updateList, 'json');
    $.get('/api/tags', updateTags, 'json');

    setSizes();
});

function setSizes() {
    $('#container').css('marginLeft', 600);
}

function clearList() {
    $('#items').html('');
}
function updateList(json) {
    // try to keep previously selected item
    var html = '';
    for (var i = 0; i < json.length; i++) {
        var item = json[ i ];
        var when = new Date( parseInt(item.createdAt) );
        html += '<article rel="' + item.id + '"><h1>' + item.title + '</h1>';
        html += '<time>' + when.format( dateFormat ) + '</time>';
        if (item.tags) {
            html += '<summary>';
            html += $.map(item.tags, function(tag) {
                return '<a href="#" rel="' + tag + '" class="tag">' + tag + '</a>';
            }).join(' &nbsp; ');
            html += '</summary>';
        }
        html += '</article>';
    }
    if (json.length == 20) {
        html += '<article class="more"><h1>more ...</h1></article>';
        offset += json.length;
    }
    $('#items').append(html);
}
function updateTags(json) {
    var html = '';
    for (var i = 0; i < json.length; i++) {
        var tag = json[ i ];
        html += '<li data-id="' + tag[2] + '"><a href="#" class="tag2">&nbsp;+&nbsp</a> <a href="#" class="tag">' + tag[0] + '</a> <span>' + tag[1] + '</span></li>';
    }
    html += '<li>&nbsp;</li>';
    html += '<li rel=""><a href="#" class="tag2">&nbsp;+&nbsp</a> <a href="#" class="tag">untagged</a></li>';
    $('#tags').html(html);
}
function updateTagsAndSelect(json) {
    var tags = selectedTags();
    updateTags(json);
    for (var i in tags) {
        var tag = tags[i];
        $('#tags li[rel=' + tag[0] + ']').addClass('selected');
    }
}
function updateArticleTags(json) {
    for (var i in json) {
        var tags = json[i];
        var html = $.map(tags, function(tag) {
            return '<a href="#" rel="' + tag + '">' + tag + '</a>';
        }).join(', ');
        $('article[rel=' + i + '] summary').html(html);
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
            $form.find('.tags').val($el.find('section').html());
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

function onMoreClick() {
    doTagClick2();
    $(this).remove();
    return false;
}

function getItem(ids, callback) {
    $.get('/api/item/' + ids, function(json) {
        callback(json);
    },'json');
}

function viewItem(item) {
    var tags;
    var showdown = new Showdown.converter();
    if (item.tags)
        tags = item.tags.join(' ');
    var html = '<article rel="' + item.id + '"><h1>';
    if (item.url)
        html += '<a href="' + item.url + '">';
    html += item.title;
    if (item.url)
        html += '</a>';
    html += '</h1><summary>' + tags + '</summary><section>' + showdown.makeHtml(item.body) + '</section></article>';
    $('#item').html(html);
    // markdown here
}
function editItem(item) {
    var tags = '';
    if(item.tags) {
        tags = item.tags.join(' ');
    }
    var when = new Date( parseInt(item.createdAt) );
    var html = '<form class="edit" rel="' + item.id + '"><input type="hidden" name="_method" value="post" />';
    
    html += '<div><input type="text" name="title" value="' + item.title + '" /></div>';
    html += '<div class="left half2"><label>tags</label><input type="text" name="tags" value="' + tags + '" /></div>';
    html += '<div class="right half2 date"><label>'+ when.format(dateFormat) + '</label><input type="text" name="createdAt" value="" /></div>';
    html += '<div class="clear url"><label>url</label><input type="text" name="url" value="' + encodeURI(item.url) + '" /></div>';
    html += '<textarea name="body">' + item.body + '</textarea>';
    html += '<button class="left submit">Submit</button>';
    html += '<button class="left delete" name="delete">Delete</button>';
    html += '</form><br class="clear" />';
    $('#item').html(html);
}

function onTagClick(e) {
    offset = 0;
    doTagClick(this, e, false);
    return false;
}
function onTagClick2(e) {
    offset = 0;
    doTagClick(this, e, true);
    return false;
}
function onItemTagClick(e) {
    var $el = $(this);
    var $a = $('#tags li[rel=' + $el.attr('rel') + ']');
    doTagClick($a[0], e, false);
    return false;
}
function doTagClick(el, e, multiple) {
    // how can i trigger this with the 'select none' tag link?
    var $el = $(el);
    var href = $el.attr('href');
    var tag = $el.attr('rel');
    var $li = $el.closest('li');

    if ($li.hasClass('selected')) {
        $li.removeClass('selected');
    } else {
        if (multiple == false)
            $('#tags li.selected').removeClass('selected');
        $li.addClass('selected');
    }
    offset = 0;
    clearList();
    doTagClick2();
    return false;
}
function doTagClick2() {
    tags = selectedTags();
    if (tags.length) {
        $.get('/api/tag/' + tags.join(',') + '/items?offset=0', updateList, 'json');
    } else {
        $.get('/api/items?offset=0', updateList, 'json');
    }
    return false;
}
function onLinkClick() {
    return false;
}

function onSubmitClick() {
    var $el = $(this);
    var $form = $el.closest('form');
    var id, url;

    if ($form.hasClass('editing')) {
        $form.find('#method').val('put');
    }

    if ($form.attr('rel'))
        id = $form.attr('rel');
    if (id)
        url = '/api/item/' + id;
    else
        url = '/api/item';

    $.post(
        url,
        $form.serializeArray(),
        function(json) {
            if (json.error) {
            } else {
                if (!id) {
                    $.get(
                        '/api/items',
                        function(json2) {
                            clearList();
                            updateList(json2);
                            $('.items article[rel=' + json.id + ']').addClass('selected');
                        },
                        'json'
                    );
                } else {
                    $.get('/api/tags', updateTagsAndSelect, 'json');
                }
                if (id) {
                    // Saving an existing item, so view the results
                    viewItem(json);
                } else {
                    // Created a new item, so go into edit mode
                    editItem(json);
                }
            }
        },
        'json'
    );

    return false;
}

function onDeleteClick() {
    var $el = $(this);
    var $form = $el.closest('form');
    var url = '/item/' + $form.attr('rel') + '/delete';
    if (!confirm('Are you sure?')) return false;
    $.post(
        url,
        function(json) {
            if (json.error) {
            } else {
                clearList();
                $.get('/api/items', updateList, 'json');
                $.get('/api/tags', updateTags, 'json');
            }
        },
        'json'
    );

    return false;
}

function onSearchClick() {
    var $el = $(this);
    var $form = $el.closest('form');

    clearList();
    $.post(
        '/api/search',
        $form.serializeArray(),
        updateList,
        'json'
    );

    return false;
}


function selectedTags() {
    var tags = [];
    $('#tags li.selected').each(function() {
        tags.push( $(this).attr('data-id') );
    });
    return tags;
}

function htmlEntities(a) {
    return a.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
