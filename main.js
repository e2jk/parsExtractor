const {app, BrowserWindow, Menu, ipcMain, dialog} = require('electron')

let win

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({width: 800, height: 600})

  // and load the index.html of the app.
  win.loadFile('src/index.html')

  // Open the DevTools.
  //win.webContents.openDevTools()

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
