const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let backendProcess = null;
let mainWindow = null;

const isDev = !app.isPackaged;

function startBackend() {
  const resourcesPath = isDev ? path.join(__dirname, '..', '..') : process.resourcesPath;
  const backendPath = path.join(resourcesPath, 'backend');
  const pythonExe = path.join(resourcesPath, '.venv', 'Scripts', 'python.exe');
  
  console.log('=== STARTING BACKEND ===');
  console.log('Resources:', resourcesPath);
  console.log('Backend:', backendPath);
  console.log('Python:', pythonExe);
  
  const python = fs.existsSync(pythonExe) ? pythonExe : 'python';
  console.log('Using:', python);
  
  const args = ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'];
  
  backendProcess = spawn(python, args, {
    cwd: backendPath,
    stdio: 'ignore',
    windowsHide: true
  });
  
  backendProcess.on('error', (err) => {
    console.error('Backend failed:', err);
  });
  
  backendProcess.on('exit', (code) => {
    console.log('Backend exited with code:', code);
  });
  
  console.log('Backend PID:', backendProcess.pid);
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    },
    show: false
  });

  Menu.setApplicationMenu(null);
  
  if (isDev) {
    await mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(process.resourcesPath, 'app', 'dist', 'index.html');
    await mainWindow.loadFile(indexPath);
  }
  
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => mainWindow = null);
}

app.whenReady().then(async () => {
  if (!isDev) {
    startBackend();
    await new Promise(r => setTimeout(r, 5000)); // ждём 5 секунд
  }
  await createWindow();
});

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', stopBackend);