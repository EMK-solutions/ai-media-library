import { Menu, app, shell } from "electron";
import { buildAppMenuTemplate } from "./build-app-menu-template";
import { triggerCheckForUpdatesFromMenu } from "./app-updater";

/** Installs the application menu (File / Edit / View / Help on Windows; macOS includes app + Window menus). */
export function installApplicationMenu(): void {
  const includeDevViewItems = !app.isPackaged;
  const template = buildAppMenuTemplate({
    includeDevViewItems,
    onCheckForUpdates: () => {
      void triggerCheckForUpdatesFromMenu();
    },
    openExternal: (url: string) => {
      void shell.openExternal(url);
    },
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
