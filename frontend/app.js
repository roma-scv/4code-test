document.getElementById('searchForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const q = document.getElementById('q').value
  const res = await fetch('/search?q=' + encodeURIComponent(q))
  const data = await res.json()
  const out = document.getElementById('results')
  out.innerHTML = ''
  data.forEach(r => {
    out.innerHTML += `<div>${r.username}</div>`
  })
})

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const username = document.getElementById('username').value
  const password = document.getElementById('password').value
  const res = await fetch('/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})})
  const data = await res.json()
  document.getElementById('token').innerText = JSON.stringify(data)
})

document.getElementById('execForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const cmd = document.getElementById('cmd').value
  const res = await fetch('/exec?cmd=' + encodeURIComponent(cmd))
  const text = await res.text()
  document.getElementById('execOut').innerText = text
})

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const filename = document.getElementById('filename').value
  const content = document.getElementById('content').value
  await fetch('/upload', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename,content})})
  alert('uploaded')
})
