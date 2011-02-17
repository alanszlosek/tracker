var Picard = require('/home/sandbox/checkouts/picard/lib/picard')

Picard.config({
// root: __filename.replace(/\/config\/env.js$/, ''),
// port: 10999,
 public_dir: '/public',
 views: '/views',
 mode: 'development' // In development mode, requests parameters will be logged.
})                    // Additionally, view templates will not be cached.

Picard.globalize().start()
