const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  globalShortcut,
  ipcMain,
  nativeTheme,
} = require("electron");
const path = require("path");
const http = require("http");

let mainWindow = null;
let tray = null;
let nextServer = null;
let appPort = 3000;

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

const isDev = !app.isPackaged && process.env.NODE_ENV !== "production";

// Start standalone Next.js server in packaged production build
async function startProductionServer() {
  const next = require("next");
  const nextApp = next({
    dev: false,
    dir: path.join(__dirname, ".."),
  });
  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();

  return new Promise((resolve) => {
    // Pick an available port (default 3300)
    const server = http.createServer((req, res) => {
      handle(req, res);
    });

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      appPort = address.port;
      console.log(`[Aether Desktop] Production server running on http://127.0.0.1:${appPort}`);
      resolve(server);
    });
  });
}

// Poll local dev server until ready
async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode >= 200 && res.statusCode < 400) resolve();
          else reject();
        });
        req.on("error", reject);
        req.setTimeout(800, () => req.destroy());
      });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  return false;
}

function createTray() {
  const iconPath = path.join(__dirname, "../build/icon.ico");
  try {
    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Aether Audiophile",
        enabled: false,
      },
      { type: "separator" },
      {
        label: "Open Sanctuary",
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      {
        label: "Play / Pause",
        click: () => {
          mainWindow?.webContents.send("media-key", "playpause");
        },
      },
      {
        label: "Next Track",
        click: () => {
          mainWindow?.webContents.send("media-key", "next");
        },
      },
      {
        label: "Previous Track",
        click: () => {
          mainWindow?.webContents.send("media-key", "previous");
        },
      },
      { type: "separator" },
      {
        label: "Exit Aether",
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setToolTip("Aether — Audiophile Music Player");
    tray.setContextMenu(contextMenu);

    tray.on("double-click", () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });
  } catch (err) {
    console.warn("Tray creation note:", err.message);
  }
}

async function createWindow() {
  nativeTheme.themeSource = "dark";

  const iconPath = path.join(__dirname, "../build/icon.ico");

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 980,
    minHeight: 660,
    backgroundColor: "#060709",
    title: "Aether — Audiophile Music",
    icon: iconPath,
    show: false,
    frame: true,
    titleBarStyle: process.platform === "win32" ? "hidden" : "default",
    titleBarOverlay:
      process.platform === "win32"
        ? {
            color: "#060709",
            symbolColor: "#E6C280",
            height: 38,
          }
        : undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // Ensures gapless audio when minimized
      spellcheck: false,
    },
  });

  // Hide default menu bar
  mainWindow.setMenuBarVisibility(false);

  // Load URL
  let targetUrl = `http://localhost:3000`;
  if (!isDev) {
    targetUrl = `http://127.0.0.1:${appPort}`;
  } else {
    // Wait for Next.js dev server if needed
    await waitForServer(targetUrl);
  }

  mainWindow.loadURL(targetUrl);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Close to tray behavior
  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  // Global Media Keys fallback
  try {
    globalShortcut.register("MediaPlayPause", () => {
      mainWindow?.webContents.send("media-key", "playpause");
    });
    globalShortcut.register("MediaNextTrack", () => {
      mainWindow?.webContents.send("media-key", "next");
    });
    globalShortcut.register("MediaPreviousTrack", () => {
      mainWindow?.webContents.send("media-key", "previous");
    });
  } catch (err) {
    console.warn("Global shortcut registration note:", err);
  }
}

// IPC Handlers
ipcMain.on("window-minimize", () => mainWindow?.minimize());
ipcMain.on("window-maximize", () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on("window-close", () => {
  if (!app.isQuitting) mainWindow?.hide();
  else mainWindow?.close();
});

app.whenReady().then(async () => {
  if (!isDev) {
    try {
      nextServer = await startProductionServer();
    } catch (err) {
      console.error("Failed to start embedded Next server:", err);
    }
  }

  createTray();
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  app.isQuitting = true;
  globalShortcut.unregisterAll();
  if (nextServer) {
    try {
      nextServer.close();
    } catch {}
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
