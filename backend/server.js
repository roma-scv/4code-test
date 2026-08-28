const express = require('express')
const bodyParser = require('body-parser')
const sqlite3 = require('sqlite3').verbose()
const cors = require('cors')
const jwt = require('jsonwebtoken')
const fs = require('fs')
const { exec } = require('child_process')
const http = require('http')

const DB_PATH = 'backend/data.db'
if (!fs.existsSync('backend')) fs.mkdirSync('backend')
if (!fs.existsSync('backend/uploads')) fs.mkdirSync('backend/uploads', { recursive: true })

const db = new sqlite3.Database(DB_PATH)
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT, password TEXT)")
  db.run("INSERT OR IGNORE INTO users(id,username,password) VALUES(1,'admin','password')")
})

const app = express()
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors({ origin: true, credentials: true }))

const JWT_SECRET = 'secret'

app.get('/search', (req, res) => {
  const q = req.query.q || ''
  const sql = "SELECT id, username FROM users WHERE username LIKE '%" + q + "%'"
  db.all(sql, (err, rows) => {
    if (err) return res.status(500).send('db error')
    res.json(rows)
  })
})

app.post('/login', (req, res) => {
  const { username, password } = req.body
  const sql = `SELECT id FROM users WHERE username = '${username}' AND password = '${password}'`
  db.get(sql, (err, row) => {
    if (row) {
      const token = jwt.sign({ id: row.id, username }, JWT_SECRET)
      return res.json({ token })
    }
    res.status(401).send('invalid')
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

app.listen(3000, () => console.log('Vulnerable server listening on 3000'))
