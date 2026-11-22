const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')
const http = require('http')
const fs = require('fs')
const url = require('url')

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain',
}

let server = null
let win = null

function startServer(root, dir) {
  return new Promise((resolve, reject) => {
    const s = http.createServer((req, res) => {
      let pathname = decodeURIComponent(url.parse(req.url).pathname)
      if (pathname === '/' || pathname === '') pathname = '/index.html'
      const file = path.join(dir, pathname)
      if (!file.startsWith(dir)) {
        res.writeHead(403)
        return res.end('Forbidden')
      }
      fs.readFile(file, (err, data) => {
        if (err) {
          res.writeHead(404)
          return res.end('Not found')
        }
        const ext = path.extname(file).toLowerCase()
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
        res.end(data)
      })
    })
    s.listen(0, '127.0.0.1', () => resolve(s))
    s.on('error', reject)
  })
}

async function createWindow() {
  const devDir = path.join(__dirname, '..', 'out')
  const packagedDir = path.join(process.resourcesPath, 'app.asar.unpacked', 'out')
  const dir = fs.existsSync(path.join(devDir, 'index.html')) ? devDir : packagedDir

  server = await startServer(__dirname, dir)
  const port = server.address().port

  win = new BrowserWindow({
    width: 420,
    height: 780,
    minWidth: 360,
    minHeight: 560,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  Menu.setApplicationMenu(null)
  win.loadURL(`http://127.0.0.1:${port}/`)
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (server) server.close()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
