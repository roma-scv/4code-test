const express = require('express')
const bodyParser = require('body-parser')
const sqlite3 = require('sqlite3').verbose()
const cors = require('cors')
const jwt = require('jsonwebtoken')
const fs = require('fs')
const { exec } = require('child_process')
const http = require('http')
const serialize = require('node-serialize')
const ejs = require('ejs')
const _ = require('lodash')
const xml2js = require('xml2js')
const axios = require('axios')

const DB_PATH = 'backend/data.db'
if (!fs.existsSync('backend')) fs.mkdirSync('backend')
if (!fs.existsSync('backend/uploads')) fs.mkdirSync('backend/uploads', { recursive: true })

const db = new sqlite3.Database(DB_PATH)
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT)")
  db.run("CREATE TABLE IF NOT EXISTS notes(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, content TEXT, x INTEGER, y INTEGER)")
  db.run("INSERT OR IGNORE INTO users(id,username,password) VALUES(1,'admin','password')")
})

const app = express()
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors({ origin: true, credentials: true }))
app.use(express.static('frontend'))

const JWT_SECRET = 'secret'

function getToken(req) {
  return req.headers.authorization || req.headers.Authorization || ''
}

function getUserFromToken(token) {
  if (!token) return null

  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (err) {
    return null
  }
}

function requireAuth(req, res, next) {
  const user = getUserFromToken(getToken(req))

  if (!user) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  req.user = user
  next()
}

app.get('/search', (req, res) => {
  const q = req.query.q || ''
  const sql = "SELECT id, username FROM users WHERE username LIKE '%" + q + "%'"
  db.all(sql, (err, rows) => {
    if (err) return res.status(500).send('db error')
    res.json(rows)
  })
})

app.post('/signup', (req, res) => {
  const username = req.body.username || ''
  const password = req.body.password || ''

  if (!username || !password) {
    return res.status(400).send('missing username or password')
  }

  db.run('INSERT INTO users(username, password) VALUES(?, ?)', [username, password], function (err) {
    if (err) {
      return res.status(500).send('signup failed')
    }

    const token = jwt.sign({ id: this.lastID, username }, JWT_SECRET)
    res.json({ token, user: { id: this.lastID, username } })
  })
})

app.post('/login', (req, res) => {
  const { username, password } = req.body

  const sql = 'SELECT id, username FROM users WHERE username = ? AND password = ?'
  db.get(sql, [username, password], (err, row) => {
    if (err) return res.status(500).send('db error')
    if (!row) return res.status(401).send('invalid')

    const token = jwt.sign({ id: row.id, username: row.username }, JWT_SECRET)
    res.json({ token, user: { id: row.id, username: row.username } })
  })
})

app.get('/me', requireAuth, (req, res) => {
  res.json({ user: { id: req.user.id, username: req.user.username } })
})

app.get('/notes', requireAuth, (req, res) => {
  db.all('SELECT id, content, x, y FROM notes WHERE user_id = ?', [req.user.id], (err, rows) => {
    if (err) return res.status(500).send('db error')
    res.json(rows || [])
  })
})

app.post('/notes', requireAuth, (req, res) => {
  const content = req.body.content || 'New note'
  const x = Number(req.body.x || 40)
  const y = Number(req.body.y || 40)

  db.run('INSERT INTO notes(user_id, content, x, y) VALUES(?, ?, ?, ?)', [req.user.id, content, x, y], function (err) {
    if (err) return res.status(500).send('db error')

    res.json({ id: this.lastID, content, x, y })
  })
})

app.put('/notes/:id', requireAuth, (req, res) => {
  const noteId = req.params.id
  const content = req.body.content || ''
  const x = Number(req.body.x || 0)
  const y = Number(req.body.y || 0)

  db.run('UPDATE notes SET content = ?, x = ?, y = ? WHERE id = ? AND user_id = ?', [content, x, y, noteId, req.user.id], (err) => {
    if (err) return res.status(500).send('db error')
    res.json({ ok: true })
  })
})

app.delete('/notes/:id', requireAuth, (req, res) => {
  const noteId = req.params.id

  db.run('DELETE FROM notes WHERE id = ? AND user_id = ?', [noteId, req.user.id], (err) => {
    if (err) return res.status(500).send('db error')
    res.json({ ok: true })
  })
})

app.get('/exec', (req, res) => {
  const cmd = req.query.cmd || ''
  exec(cmd, { timeout: 5000 }, (err, stdout, stderr) => {
    if (err) return res.status(500).send(err.toString())
    res.send(stdout || stderr)
  })
})

app.post('/upload', (req, res) => {
  const filename = req.body.filename || 'uploaded.txt'
  const content = req.body.content || ''
  const path = 'backend/uploads/' + filename
  fs.writeFile(path, content, (err) => {
    if (err) return res.status(500).send('write error')
    res.send('ok')
  })
})

app.get('/redirect', (req, res) => {
  const next = req.query.next || '/'
  res.redirect(next)
})

app.get('/ssrf', (req, res) => {
  const url = req.query.url
  if (!url) return res.status(400).send('missing')
  http.get(url, (r) => {
    let data = ''
    r.on('data', (c) => data += c)
    r.on('end', () => res.send(data))
  }).on('error', () => res.status(500).send('fetch error'))
})

app.get('/profile/:id', (req, res) => {
  const id = req.params.id
  db.get("SELECT id, username FROM users WHERE id = " + id, (err, row) => {
    if (err) return res.status(500).send('error')
    if (!row) return res.status(404).send('not found')
    res.json(row)
  })
})

// Insecure deserialization (CVE-2017-5941, node-serialize 0.0.4)
// Untrusted input passed to unserialize() enables arbitrary code execution.
app.post('/deserialize', (req, res) => {
  const data = req.body.data || ''
  try {
    const obj = serialize.unserialize(data)
    res.json({ restored: obj })
  } catch (err) {
    res.status(500).send('deserialize error')
  }
})

// Server-side template injection (CVE-2022-29078, ejs 3.1.6)
// User-controlled options reach ejs.render and allow RCE.
app.get('/render', (req, res) => {
  const name = req.query.name || 'guest'
  try {
    const out = ejs.render('<p>Hello <%= name %></p>', { name }, req.query)
    res.send(out)
  } catch (err) {
    res.status(500).send('render error')
  }
})

// Prototype pollution / command injection via lodash (CVE-2020-8203, CVE-2021-23337; lodash 4.17.19)
app.post('/merge', (req, res) => {
  const target = {}
  _.merge(target, req.body)
  res.json({ merged: target })
})

// XML external/prototype pollution parsing (CVE-2023-0842, xml2js 0.4.23)
app.post('/parse-xml', (req, res) => {
  const xml = req.body.xml || ''
  xml2js.parseString(xml, (err, result) => {
    if (err) return res.status(500).send('xml error')
    res.json({ parsed: result })
  })
})

// SSRF via axios, leaking XSRF token across hosts (CVE-2023-45857, axios 1.5.1)
app.get('/fetch', async (req, res) => {
  const url = req.query.url
  if (!url) return res.status(400).send('missing url')
  try {
    const r = await axios.get(url)
    res.send(r.data)
  } catch (err) {
    res.status(500).send('fetch error')
  }
})

// JWT "alg: none" signature bypass (CVE-2022-23540, jsonwebtoken 8.5.1)
// verify() without an explicit algorithms list accepts unsigned tokens.
app.get('/verify-token', (req, res) => {
  const token = getToken(req)
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).send('invalid')
    res.json({ decoded })
  })
})

app.listen(3000, () => console.log('Server listening on 3000'))
