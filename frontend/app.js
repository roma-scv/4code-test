const authApp = const authApp = document.getElementById('authApp')
const homeApp = document.getElementById('homeApp')
const signupForm = document.getElementById('signupForm')
const loginForm = document.getElementById('loginForm')
const authMessage = document.getElementById('authMessage')
const board = document.getElementById('board')
const addNoteBtn = document.getElementById('addNoteBtn')
const logoutBtn = document.getElementById('logoutBtn')
const currentUser = document.getElementById('currentUser')
const searchForm = document.getElementById('searchForm')
const results = document.getElementById('results')
const execForm = document.getElementById('execForm')
const execOut = document.getElementById('execOut')
const uploadForm = document.getElementById('uploadForm')

const STORAGE_KEY = 'sticky-note-token'
const USER_KEY = 'sticky-note-user'
let notes = []

function setAuthMessage(msg, isError = false) {
  authMessage.textContent = msg
  authMessage.style.color = isError ? '#b00020' : '#0b6e4f'
}

function showAuth() {
  authApp.hidden = false
  homeApp.hidden = true
}

function showHome() {
  authApp.hidden = true
  homeApp.hidden = false
}

function getToken() {
  return localStorage.getItem(STORAGE_KEY)
}

function saveSession(token, user) {
  localStorage.setItem(STORAGE_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  currentUser.textContent = user.username
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(USER_KEY)
  currentUser.textContent = ''
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }

  const token = getToken()
  if (token) {
    headers.Authorization = token
  }

  const response = await fetch(path, {
    ...options,
    headers
  })

  const contentType = response.headers.get('content-type') || ''
  const body = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    throw new Error(typeof body === 'string' ? body : body.error || 'request failed')
  }

  return body
}

async function doSignup(event) {
  event.preventDefault()
  const username = document.getElementById('signupUsername').value
  const password = document.getElementById('signupPassword').value

  try {
    const data = await request('/signup', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    })

    saveSession(data.token, data.user)
    showHome()
    setAuthMessage('')
    loadNotes()
  } catch (error) {
    setAuthMessage(error.message, true)
  }
}

async function doLogin(event) {
  event.preventDefault()
  const username = document.getElementById('loginUsername').value
  const password = document.getElementById('loginPassword').value

  try {
    const data = await request('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    })

    saveSession(data.token, data.user)
    showHome()
    setAuthMessage('')
    loadNotes()
  } catch (error) {
    setAuthMessage(error.message, true)
  }
}

async function loadNotes() {
  try {
    notes = await request('/notes')
    renderNotes()
  } catch (error) {
    console.error(error)
    setAuthMessage(error.message, true)
  }
}

function renderNotes() {
  board.innerHTML = ''

  notes.forEach((note) => {
    const noteCard = document.createElement('div')
    noteCard.className = 'note'
    noteCard.dataset.id = note.id
    noteCard.style.left = note.x + 'px'
    noteCard.style.top = note.y + 'px'

    const header = document.createElement('div')
    header.className = 'note-header'

    const title = document.createElement('span')
    title.textContent = 'Note'

    const deleteBtn = document.createElement('button')
    deleteBtn.textContent = 'Delete'
    deleteBtn.addEventListener('click', async () => {
      await request(`/notes/${note.id}`, { method: 'DELETE' })
      notes = notes.filter((item) => item.id !== note.id)
      renderNotes()
    })

    header.appendChild(title)
    header.appendChild(deleteBtn)

    const textarea = document.createElement('textarea')
    textarea.value = note.content
    textarea.addEventListener('input', async (event) => {
      note.content = event.target.value
      await request(`/notes/${note.id}`, {
        method: 'PUT',
        body: JSON.stringify({ content: note.content, x: note.x, y: note.y })
      })
    })

    noteCard.appendChild(header)
    noteCard.appendChild(textarea)
    board.appendChild(noteCard)

    makeDraggable(noteCard, note)
  })
}

function makeDraggable(noteCard, note) {
  let dragging = false
  let startX = 0
  let startY = 0
  let originalX = 0
  let originalY = 0

  noteCard.addEventListener('pointerdown', (event) => {
    if (event.target.tagName === 'TEXTAREA' || event.target.tagName === 'BUTTON') {
      return
    }

    dragging = true
    startX = event.clientX
    startY = event.clientY
    originalX = note.x
    originalY = note.y
    noteCard.setPointerCapture(event.pointerId)
  })

  noteCard.addEventListener('pointermove', (event) => {
    if (!dragging) return

    const deltaX = event.clientX - startX
    const deltaY = event.clientY - startY

    note.x = Math.max(0, originalX + deltaX)
    note.y = Math.max(0, originalY + deltaY)

    noteCard.style.left = note.x + 'px'
    noteCard.style.top = note.y + 'px'
  })

  noteCard.addEventListener('pointerup', async () => {
    if (!dragging) return

    dragging = false
    await request(`/notes/${note.id}`, {
      method: 'PUT',
      body: JSON.stringify({ content: note.content, x: note.x, y: note.y })
    })
  })
}

async function addNote() {
  const note = await request('/notes', {
    method: 'POST',
    body: JSON.stringify({ content: 'New note', x: 40, y: 40 })
  })

  notes.push(note)
  renderNotes()
}

async function init() {
  signupForm.addEventListener('submit', doSignup)
  loginForm.addEventListener('submit', doLogin)
  addNoteBtn.addEventListener('click', addNote)

  searchForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    const q = document.getElementById('q').value
    const data = await request('/search?q=' + encodeURIComponent(q))
    results.innerHTML = data.map((row) => `<div>${row.username}</div>`).join('')
  })

  execForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    const cmd = document.getElementById('cmd').value
    const text = await request('/exec?cmd=' + encodeURIComponent(cmd))
    execOut.textContent = text
  })

  uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    const filename = document.getElementById('filename').value
    const content = document.getElementById('content').value
    await request('/upload', {
      method: 'POST',
      body: JSON.stringify({ filename, content })
    })
    alert('uploaded')
  })

  logoutBtn.addEventListener('click', () => {
    clearSession()
    showAuth()
    notes = []
    renderNotes()
  })

  const token = getToken()
  if (token) {
    try {
      const data = await request('/me')
      saveSession(token, data.user)
      showHome()
      loadNotes()
    } catch (error) {
      clearSession()
      showAuth()
    }
  } else {
    showAuth()
  }
}

init()
