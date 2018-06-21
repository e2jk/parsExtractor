const {app, BrowserWindow, Menu, ipcMain, dialog} = require('electron')
const path = require('path')

let win
const isDebug = 0;

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({width: 800, height: 600, icon: path.join(__dirname, "assets/icons/icon.png")})

  // and load the index.html of the app.
  win.loadFile('src/index.html')

  // Open the DevTools.
  if (1 < isDebug) {
    win.webContents.openDevTools()
  }

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })

  var menu = Menu.buildFromTemplate([
    {
      label: "File",
      submenu: [
        {
          label: "Open File...",
          click() {
            console.log("Opening file via menu");
            openFile(win.webContents)
          }
        },
        {type: "separator"},
        {
          label: "Exit",
          click() {
            app.quit()
          }
        },
      ]
    }
  ])

  Menu.setApplicationMenu(menu);
  if (0 < isDebug) {
    setTimeout ( function functionName() {
      console.log("DEBUG: automatically opening sample HL7 file './temp/export.hl7'");
      win.webContents.send('selected-file', "./temp/export.hl7")
    }, 1000 );
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

function openFile(renderWindow) {
  // renderWindow is where the file name will be sent back to (Renderer)
  dialog.showOpenDialog({
    properties: ['openFile']
  }, (files) => {
    if (files) {
      console.log(files);
      console.log("File to be opened: " + files[0]);
      renderWindow.send('selected-file', files[0])
    }
  })
}

ipcMain.on('open-file-dialog', (event) => {
  openFile(event.sender);
})

ipcMain.on('save-dialog', (event) => {
  const options = {
    title: 'Save to CSV file',
    filters: [
      { name: 'CSV files', extensions: ['csv'] }
    ]
  }
  dialog.showSaveDialog(options, (filename) => {
    event.sender.send('saved-file', filename)
  })
});
