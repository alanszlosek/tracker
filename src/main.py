from flask import g, Flask, request
import json
import re
import sqlite3
import time

def connect_db():
    return sqlite3.connect('../database/tracker.sqlite3')

app = Flask(__name__)

@app.before_request
def before_request():
    g.db = connect_db()

@app.teardown_request
def teardown_request(exception):
    if hasattr(g, 'db'):
        g.db.close()


@app.route("/")
def getRoot():
    return "Hello World!"

@app.route("/items")
def getItems():
    offset = 0
    if 'offset' in request.args:
        offset = int(request.args['offset'])
    return json.dumps( itemObjects(offset, None))

@app.route("/tag/<tags>/items")
def getItemsByTag(tags):
    db = g.db
    c = db.cursor()
    tags = tags.split(',')
    tags = list(map(str, map(int, tags)))
    c.execute('SELECT item_tag.item_id FROM item_tag WHERE item_tag.tag_id IN (%s) GROUP BY item_id HAVING count(item_id)=%d' % (','.join(tags), len(tags)))
    ids = []
    for tag in c:
        ids.append(tag[0])
    return json.dumps( itemObjects(0, ids) )


@app.route("/item/<int:id>", methods=['GET'])
def getItemById(id):
    return json.dumps( itemObject(id) )

def itemObjects(offset, ids):
    db = g.db
    c = db.cursor()
    d = db.cursor()
    out = []
    if not (ids is None):
        # map ids to ints, to strings, to IN clause
        ids = list(map(str, ids))
        ids = ','.join(ids)
        c.execute("select id,title,createdAt FROM item WHERE id IN (%s) ORDER BY createdAt DESC LIMIT 0,20" % (ids,))
        d.execute('SELECT item_tag.item_id,tag.tag FROM item_tag LEFT JOIN tag ON (item_tag.tag_id=tag.id) WHERE item_tag.item_id IN (%s) ORDER BY item_tag.item_id DESC, tag.tag ASC' % (ids,))
    else:
        c.execute("select id,title,createdAt FROM item ORDER BY createdAt DESC LIMIT 0,20")
        d.execute('SELECT item_tag.item_id,tag.tag FROM item_tag LEFT JOIN tag ON (item_tag.tag_id=tag.id) WHERE item_tag.item_id IN (select id FROM item ORDER BY createdAt DESC LIMIT 0,20) ORDER BY item_tag.item_id DESC, tag.tag ASC')
    item_tag = d.fetchall()

    for row in c:
        tags = []
        # TODO: still something wrong with this logic
        while len(item_tag) > 0 and item_tag[0][0] == row[0]:
            tag = item_tag.pop(0)
            tags.append(tag[1])
        out.append({
            'id': row[0],
            'title': row[1],
            'createdAt': row[2],
            'tags': tags
        })
    return out

def itemObject(id):
    db = g.db
    c = db.cursor()
    d = db.cursor()
    out = []
    c.execute("select id,title,url,body,createdAt FROM item WHERE id=?", (id,))
    d.execute('SELECT item_tag.item_id,tag.tag FROM item_tag LEFT JOIN tag ON (item_tag.tag_id=tag.id) WHERE item_tag.item_id IN (?) ORDER BY item_tag.item_id DESC, tag.tag ASC', (id,))
    
    tags = []
    for tag in d:
        tags.append(tag[1])

    row = c.fetchone()
    out = {
        'id': row[0],
        'title': row[1],
        'url': row[2],
        'body': row[3],
        'createdAt': row[4],
        'tags': tags
    }
    return out

# Add item
@app.route("/item", methods=['POST'])
def addItem():
    db = g.db
    c = db.cursor()
    title = request.form['title']
    url = ''
    tags = []
    if title[0:4] == 'http':
        url = title
        # TODO: fetch the title via http request later
        #title = extractTitle(url)
        #if not title:
        #    title = 'oops'
        tags = ['url']
    else:
        # if title is a single word, also use that word for a tag
        if re.match(r"^\w+$", title):
            tags = [title]
    createdAt = int(time.time()) * 1000
    data = (title, url, '', createdAt)

    if c.execute('INSERT INTO item (title,url,body,createdAt) VALUES(?,?,?,?)', data):
        id = c.lastrowid
        tagItem(id, tags)
        db.commit()
        return json.dumps( itemObject(id) )
        
    return '{}'

# Update item
@app.route("/item/<int:id>", methods=['POST'])
def editItem(id):
    updatedAt = int(time.time()) * 1000
    # TODO: add in ability to update createdAt value, parse to unix timestamp
    data = (request.form['title'], request.form['body'], request.form['url'], updatedAt, id)

    db = g.db
    c = db.cursor()
    c.execute('UPDATE item SET title=?, body=?, url=?, updatedAt=? WHERE id=?', data)
    tags = []
    for tag in re.split('\s+', request.form['tags'].strip()):
        tags.append( tag.strip() )
    tagItem(id, tags)
    db.commit()
    return json.dumps( itemObject(id) )

# DELETE
@app.route("/item/<int:id>", methods=['DELETE'])
def deleteItem(id):
    db = g.db
    c = db.cursor()
    c.execute('DELETE FROM items WHERE id=?', (id,))
    c.execute('DELETE FROM item_tag WHERE item_id=?', (id,))
    return '{}'


@app.route("/tags")
def getTags():
    db = g.db
    c = db.cursor()
    out = []
    c.execute("select tag.tag,count(tag.id),tag.id from tag LEFT JOIN item_tag ON (tag.id=item_tag.tag_id) GROUP BY tag.id ORDER BY count(tag.id) DESC, tag.tag")
    for row in c:
        out.append([
            row[0],
            row[1],
            row[2]
        ])
    return json.dumps(out)



# Search
@app.route("/search", methods=['POST'])
def search():
    db = g.db
    c = db.cursor()
    s = request.form['title'].strip()
    if len(s) == 0:
        return '[]'
    
    parts = re.split(r'\s+', s)
    tags = []
    words = []
    for part in parts:
        if part[0:1] == '#':
            tags.append( part[1:].strip() )
        else:
            words.append(part)
    
    a = []
    if len(words):
        words = ' '.join(words)
        sql = "SELECT id FROM item WHERE title LIKE '%" + words + "%' OR body LIKE '%" + words + "%' OR url LIKE '%" + words + "%'"
        c.execute(sql)
        for row in c:
            a.append(row[0])

    b = []
    if len(tags):
        tags = tagIds(tags)
        c.execute('SELECT item_tag.item_id FROM item_tag WHERE item_tag.tag_id IN (%s) GROUP BY item_id HAVING count(item_id)=%d' % (','.join(map(str,tags)), len(tags)))

        for row in c:
            b.append(row[0])
    
    if len(a) and len(b):
        c = list(set(a) & set(b))
    else:
        c = list(set(a) | set(b))
    return json.dumps( itemObjects(0, c))



def tagItem(id, tags):
    db = g.db
    c = db.cursor()

    tags = tagIds(tags)
    print(tags)

    c.execute('DELETE FROM item_tag WHERE item_id=?', (id,))

    data = []
    for tag in tags:
        data.append( (id, tag) )
    print(data)
    c.executemany('REPLACE INTO item_tag (item_id,tag_id) VALUES(?,?)', data)

def lookupTags(tags):
    return fetchKeyValue('SELECT tag,id FROM tag WHERE tag IN (%s)' % placeholders(tags), tags)

def tagIds(tags):
    db = g.db
    c = db.cursor()
    # Find ids
    tagId = fetchKeyValue('SELECT tag,id FROM tag WHERE tag IN (%s)' % placeholders(tags), tags)
    foundTags = tagId.keys()
    toCreate = tags - foundTags
    data = []
    for tagName in toCreate:
        data.append( (tagName,) )
    # Create tags for those that don't exist
    c.executemany('INSERT INTO tag (tag) VALUES (?)', data)

    return fetchValues('SELECT id FROM tag WHERE tag IN (%s)' % placeholders(tags), tags)

def fetchValues(sql, data):
    out = []
    db = g.db
    c = db.cursor()
    c.execute(sql, data)
    for row in c:
        out.append(row[0])
    return out

def fetchKeyValue(sql, data):
    out = {}
    db = g.db
    c = db.cursor()
    c.execute(sql, data)
    for row in c:
        out[ row[0] ] = row[1]
    return out

# Return comma separated questionmark placeholders for each item in the list
def placeholders(items):
    l = len(items)
    return ('?,' * l)[0:-1]