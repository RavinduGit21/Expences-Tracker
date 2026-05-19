const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const path = require('path');

const isDev = process.argv.includes('--dev');
let mainWindow;

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

function dataFile() {
  return path.join(app.getPath('userData'), 'expense-data.json');
}

function defaultData() {
  return {
    settings: {
      onboarded: false,
      currency: 'LKR',
      monthlyBudget: 0,
      salary: 0,
      categories: ['Fuel', 'Meals', 'Groceries', 'Bills', 'Transport', 'Shopping', 'Health', 'Other'],
      cards: [
        { id: 'card_cash', name: 'Cash', bankId: 'cash', logoText: 'CASH', color: '#334155', accent: '#94a3b8', openingBalance: 0, limit: 0 }
      ]
    },
    expenses: [],
    incomes: []
  };
}

function ensureDataFile() {
  const file = dataFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(defaultData(), null, 2));
  }
  return file;
}

function readData() {
  try {
    const file = ensureDataFile();
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      ...defaultData(),
      ...parsed,
      settings: { ...defaultData().settings, ...(parsed.settings || {}) }
    };
  } catch (error) {
    return defaultData();
  }
}

function writeData(data) {
  const file = ensureDataFile();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return data;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#f6f7fb',
    title: 'Card Expense Tracker',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(() => checkForUpdates(), 2500);
    });
  }
}

function sendUpdateStatus(status, payload = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('update:status', { status, ...payload });
}

async function checkForUpdates() {
  if (isDev || !app.isPackaged) {
    sendUpdateStatus('disabled', { message: 'Updates are available only in the installed app.' });
    return { disabled: true };
  }

  try {
    sendUpdateStatus('checking');
    return await autoUpdater.checkForUpdates();
  } catch (error) {
    sendUpdateStatus('error', { message: error.message || 'Could not check for updates.' });
    return { error: error.message };
  }
}

autoUpdater.on('update-available', (info) => {
  sendUpdateStatus('available', {
    version: info.version,
    releaseName: info.releaseName,
    releaseDate: info.releaseDate,
    releaseNotes: info.releaseNotes
  });
});

autoUpdater.on('update-not-available', () => {
  sendUpdateStatus('not-available');
});

autoUpdater.on('download-progress', (progress) => {
  sendUpdateStatus('downloading', {
    percent: Math.round(progress.percent || 0),
    transferred: progress.transferred,
    total: progress.total
  });
});

autoUpdater.on('update-downloaded', (info) => {
  sendUpdateStatus('downloaded', { version: info.version });
});

autoUpdater.on('error', (error) => {
  sendUpdateStatus('error', { message: error.message || 'Update failed.' });
});

app.whenReady().then(() => {
  ipcMain.handle('store:load', () => readData());
  ipcMain.handle('store:save', (_event, data) => writeData(data));
  ipcMain.handle('store:path', () => dataFile());
  ipcMain.handle('store:export', async (_event, payload) => {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export expense data',
      defaultPath: payload.defaultName || 'expense-data.json',
      filters: payload.filters || [{ name: 'JSON', extensions: ['json'] }]
    });
    if (canceled || !filePath) return { canceled: true };
    fs.writeFileSync(filePath, payload.content, 'utf8');
    return { canceled: false, filePath };
  });
  ipcMain.handle('update:check', () => checkForUpdates());
  ipcMain.handle('update:download', async () => {
    try {
      sendUpdateStatus('downloading', { percent: 0 });
      return await autoUpdater.downloadUpdate();
    } catch (error) {
      sendUpdateStatus('error', { message: error.message || 'Could not download update.' });
      return { error: error.message };
    }
  });
  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
