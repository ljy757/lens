import { app, BrowserWindow, dialog, Menu, MenuItem, MenuItemConstructorOptions, shell, webContents } from "electron"
import { isDevelopment, isMac, issuesTrackerUrl, isWindows, slackUrl } from "../common/vars";

// todo: refactor + split menu sections to separated files, e.g. menus/file.menu.ts

export interface MenuOptions {
  logoutHook: any;
  addClusterHook: any;
  clusterSettingsHook: any;
  showWhatsNewHook: any;
  showPreferencesHook: any;
  // all the above are really () => void type functions
}

function setClusterSettingsEnabled(enabled: boolean) {
  const menuIndex = isMac ? 1 : 0
  Menu.getApplicationMenu().items[menuIndex].submenu.items[1].enabled = enabled
}

function showAbout(_menuitem: MenuItem, browserWindow: BrowserWindow) {
  const appDetails = [
    `Version: ${app.getVersion()}`,
  ]
  appDetails.push(`Copyright 2020 Lakend Labs, Inc.`)
  let title = "Lens"
  if (isWindows) {
    title = `  ${title}`
  }
  dialog.showMessageBoxSync(browserWindow, {
    title,
    type: "info",
    buttons: ["Close"],
    message: `Lens`,
    detail: appDetails.join("\r\n")
  })
}

/**
 * Constructs the menu based on the example at: https://electronjs.org/docs/api/menu#main-process
 * Menu items are constructed piece-by-piece to have slightly better control on individual sub-menus
 *
 * @param ipc the main promiceIpc handle. Needed to be able to hook IPC sending into logout click handler.
 */
export default function initMenu(opts: MenuOptions, promiseIpc: any) {
  const mt: MenuItemConstructorOptions[] = [];
  const macAppMenu: MenuItemConstructorOptions = {
    label: app.getName(),
    submenu: [
      {
        label: "About Lens",
        click: showAbout
      },
      { type: 'separator' },
      {
        label: 'Preferences',
        click: opts.showPreferencesHook,
        enabled: true
      },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  };
  if (isMac) {
    mt.push(macAppMenu);
  }

  let fileMenu: MenuItemConstructorOptions;
  if (isMac) {
    fileMenu = {
      label: 'File',
      submenu: [{
        label: 'Add Cluster...',
        click: opts.addClusterHook,
      },
        {
          label: 'Cluster Settings',
          click: opts.clusterSettingsHook,
          enabled: false
        }
      ]
    }
  }
  else {
    fileMenu = {
      label: 'File',
      submenu: [
        {
          label: 'Add Cluster...',
          click: opts.addClusterHook,
        },
        {
          label: 'Cluster Settings',
          click: opts.clusterSettingsHook,
          enabled: false
        },
        { type: 'separator' },
        {
          label: 'Preferences',
          click: opts.showPreferencesHook,
          enabled: true
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }
  }
  mt.push(fileMenu);

  const editMenu: MenuItemConstructorOptions = {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'delete' },
      { type: 'separator' },
      { role: 'selectAll' },
    ]
  };
  mt.push(editMenu);

  const viewMenu: MenuItemConstructorOptions = {
    label: 'View',
    submenu: [
      {
        label: 'Back',
        accelerator: 'CmdOrCtrl+[',
        click() {
          webContents.getFocusedWebContents().executeJavaScript('window.history.back()')
        }
      },
      {
        label: 'Forward',
        accelerator: 'CmdOrCtrl+]',
        click() {
          webContents.getFocusedWebContents().executeJavaScript('window.history.forward()')
        }
      },
      {
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click() {
          webContents.getFocusedWebContents().reload()
        }
      },
      ...(isDevelopment ? [
        { role: 'toggleDevTools' } as MenuItemConstructorOptions,
        {
          accelerator: "CmdOrCtrl+Shift+I",
          label: 'Open Dashboard Devtools',
          click() {
            webContents.getFocusedWebContents().openDevTools()
          }
        }
      ] : []),
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  };
  mt.push(viewMenu);

  const helpMenu: MenuItemConstructorOptions = {
    role: 'help',
    submenu: [
      {
        label: 'License',
        click: async () => {
          shell.openExternal('https://lakendlabs.com/licenses/lens-eula.md');
        },
      },
      {
        label: 'Community Slack',
        click: async () => {
          shell.openExternal(slackUrl);
        },
      },
      {
        label: 'Report an Issue',
        click: async () => {
          shell.openExternal(issuesTrackerUrl);
        },
      },
      {
        label: "What's new?",
        click: opts.showWhatsNewHook,
      },
      ...(!isMac ? [{
        label: "About Lens",
        click: showAbout
      } as MenuItemConstructorOptions] : [])
    ]
  };
  mt.push(helpMenu);

  const menu = Menu.buildFromTemplate(mt);
  Menu.setApplicationMenu(menu);

  promiseIpc.on("enableClusterSettingsMenuItem", (clusterId: string) => {
    setClusterSettingsEnabled(true)
  });

  promiseIpc.on("disableClusterSettingsMenuItem", () => {
    setClusterSettingsEnabled(false)
  });
};
