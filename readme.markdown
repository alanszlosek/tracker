Introduction
====

I use Tracker for journal keeping, blog staging, link-tracking, logging comments on said links. The UI is a three-column setup (inspired by thinkery.me): tags sorted by frequency, then items, then the item currently being viewed or edited.

Here's what it looks like: [tracker.png](https://www.greaterscope.net/files/tracker.png)

Requirements
====

* Python 3
* pip3 - to install other dependencies

Installation
====

1. `cd src`
1. `python3 -m venv ./venv`
1. `source venv/bin/activate`
1. `pip install flask`
1. `cat ../config/schema.sqlite3 | sqlite3 ../database/tracker.sqlite3`
1. `env FLASK_APP=main.py flask run`

Features
====

* Pure AJAX interaction with webserver means backend can be in any language
* Can filter items by one or more tags at a time
* Clicking on an item in the items column shows it as text, clicking again opens it for editing
* Bookmarklet for quickly adding URLs
* When adding an item by URL, the title is fetched by the server, URL stored in the url field, title as the title. Auto-tagged with "url".

