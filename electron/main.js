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
const fs = require("fs");

// Crucial audio & media switches for Chromium
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
app.commandLine.appendSwitch("disable-features", "PreloadMediaEngagementData,MediaEngagementBypassAutoplayPolicies");

const CHROME_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

let mainWindow = null;
let tray = null;
let nextServer = null;
const PROD_PORT = 3333;

// Log to file in userData for easy debugging
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(" ")}\n`;
  console.log(...args);
  try {
    const logPath = path.join(app.getPath("userData"), "aether-desktop.log");
    fs.appendFileSync(logPath, line);
  } catch {}
}

// Single instance lock
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

// Determine base directory for Next.js app
function getAppDir() {
  if (app.isPackaged) {
    // In unpackaged/packaged electron, resources/app is the base
    return path.join(process.resourcesPath, "app");
  }
  return path.join(__dirname, "..");
}

// Check if a given URL is currently responding
function checkHttpReady(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Start embedded Next.js production server
async function startProductionServer(appDir) {
  log("Starting Next.js production server in:", appDir);
  const next = require("next");
  const nextApp = next({
    dev: false,
    dir: appDir,
  });
  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();
  log("Next.js engine prepared successfully");

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      handle(req, res);
    });

    server.on("error", (err) => {
      log("Next.js HTTP server error:", err);
      reject(err);
    });

    server.listen(PROD_PORT, "127.0.0.1", () => {
      log(`Aether Audio Server listening on http://127.0.0.1:${PROD_PORT}`);
      resolve(server);
    });
  });
}

function createTray() {
  const iconPath = path.join(__dirname, "../build/icon.ico");
  try {
    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
      { label: "Aether Audiophile", enabled: false },
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
        click: () => mainWindow?.webContents.send("media-key", "playpause"),
      },
      {
        label: "Next Track",
        click: () => mainWindow?.webContents.send("media-key", "next"),
      },
      {
        label: "Previous Track",
        click: () => mainWindow?.webContents.send("media-key", "previous"),
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
        if (mainWindow.isVisible()) mainWindow.hide();
        else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });
  } catch (err) {
    log("Tray warning:", err.message);
  }
}

function getConnectingHtml(statusMessage = "Connecting to Aether Audio Engine...") {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Aether Sanctuary</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #060709;
      color: #F3F3F6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      overflow: hidden;
      user-select: none;
    }
    .disc {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      border: 2px solid rgba(230, 194, 128, 0.4);
      border-top-color: #E6C280;
      animation: spin 1.2s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite;
      box-shadow: 0 0 25px rgba(230, 194, 128, 0.25);
      margin-bottom: 24px;
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    h1 {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.3em;
      color: #FFFFFF;
      margin: 0 0 8px 0;
      text-transform: uppercase;
    }
    p {
      font-size: 11px;
      font-family: monospace;
      letter-spacing: 0.15em;
      color: #E6C280;
      margin: 0 0 20px 0;
      text-transform: uppercase;
    }
    button {
      background: #E6C280;
      color: #060709;
      border: none;
      padding: 8px 20px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: bold;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      cursor: pointer;
      transition: transform 0.2s, background 0.2s;
    }
    button:hover { background: #F5D698; transform: scale(1.05); }
  </style>
</head>
<body>
  <div class="disc"></div>
  <h1>A E T H E R</h1>
  <p>${statusMessage}</p>
  <button onclick="location.reload()">Retry Connection</button>
</body>
</html>`;
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
      backgroundThrottling: false,
      spellcheck: false,
      webSecurity: false,
    },
  });

  mainWindow.webContents.setUserAgent(CHROME_USER_AGENT);
  mainWindow.setMenuBarVisibility(false);

  // Load luxury connecting screen immediately so the user NEVER sees a raw black window
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getConnectingHtml())}`);

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

  // F12 / DevTools shortcut
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F12" && input.type === "keyDown") {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  // Handle load failure gracefully
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    log("did-fail-load:", errorCode, errorDescription, validatedURL);
    if (!validatedURL.startsWith("data:")) {
      mainWindow.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(
          getConnectingHtml(`Connection error (${errorDescription}). Retrying...`)
        )}`
      );
      // Auto-retry in 2.5s
      setTimeout(() => {
        checkAndConnect();
      }, 2500);
    }
  });

  // Global Media Keys
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
    log("Global shortcut note:", err);
  }

  // Connect to the active server
  checkAndConnect();
}

async function checkAndConnect() {
  // 1. First check if standard dev server (port 3000) is running
  const devReady = await checkHttpReady("http://localhost:3000");
  if (devReady) {
    log("Found active server on http://localhost:3000, connecting...");
    mainWindow?.loadURL("http://localhost:3000");
    return;
  }

  // 2. Next check if embedded production server (port 3333) is running
  const prodReady = await checkHttpReady(`http://127.0.0.1:${PROD_PORT}`);
  if (prodReady) {
    log(`Connecting to production server on http://127.0.0.1:${PROD_PORT}...`);
    mainWindow?.loadURL(`http://127.0.0.1:${PROD_PORT}`);
    return;
  }

  // 3. If neither is running and not in dev, try starting the embedded server
  const appDir = getAppDir();
  log("Attempting to start embedded production server in:", appDir);

  try {
    if (!nextServer) {
      nextServer = await startProductionServer(appDir);
    }
    mainWindow?.loadURL(`http://127.0.0.1:${PROD_PORT}`);
  } catch (err) {
    log("Embedded server start failed:", err.message);
    // Display helpful diagnostic in window
    mainWindow?.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(
        getConnectingHtml(
          `Local Audio Server Failed: ${err.message}. Run "npm run build" to generate production files, or "npm run dev".`
        )
      )}`
    );
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
  const { session } = require("electron");

  // Allow YouTube embeds by spoofing native YouTube origin and Referer
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ["*://*.youtube.com/*", "*://*.googlevideo.com/*", "*://*.ytimg.com/*"] },
    (details, callback) => {
      details.requestHeaders["User-Agent"] = CHROME_USER_AGENT;
      details.requestHeaders["Referer"] = "https://www.youtube.com/";
      details.requestHeaders["Origin"] = "https://www.youtube.com";
      callback({ cancel: false, requestHeaders: details.requestHeaders });
    }
  );

  // Strip restrictive embedding headers (X-Frame-Options & CSP) from YouTube responses
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ["*://*.youtube.com/*", "*://*.googlevideo.com/*"] },
    (details, callback) => {
      const responseHeaders = { ...details.responseHeaders };
      delete responseHeaders["x-frame-options"];
      delete responseHeaders["X-Frame-Options"];
      delete responseHeaders["content-security-policy"];
      delete responseHeaders["Content-Security-Policy"];
      callback({ cancel: false, responseHeaders });
    }
  );

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
