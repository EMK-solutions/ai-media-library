import type { MenuItemConstructorOptions } from "electron";
import {
  APP_DISPLAY_NAME,
  DOCUMENTATION_README_URL,
  LICENSE_URL,
} from "./app-links";

export interface BuildAppMenuTemplateOptions {
  /** Include Reload / Toggle Developer Tools (development only). */
  includeDevViewItems: boolean;
  /** Called when user chooses Help → Check for Updates. */
  onCheckForUpdates: () => void;
  /** Opens a URL in the default browser (README, license page). */
  openExternal: (url: string) => void;
}

/**
 * Builds the Electron application menu template (cross-platform).
 * Separated for unit testing of structure without constructing native menus.
 */
export function buildAppMenuTemplate(
  options: BuildAppMenuTemplateOptions,
): MenuItemConstructorOptions[] {
  const { includeDevViewItems, onCheckForUpdates, openExternal } = options;

  const editMenu: MenuItemConstructorOptions = {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "selectAll" },
    ],
  };

  const viewSubmenu: MenuItemConstructorOptions["submenu"] = [];
  if (includeDevViewItems) {
    viewSubmenu.push(
      { role: "reload" },
      { role: "forceReload" },
      { role: "toggleDevTools" },
      { type: "separator" },
    );
  }
  viewSubmenu.push(
    { role: "resetZoom" },
    { role: "zoomIn" },
    { role: "zoomOut" },
    { type: "separator" },
    { role: "togglefullscreen" },
  );

  const viewMenu: MenuItemConstructorOptions = {
    label: "View",
    submenu: viewSubmenu,
  };

  const helpMenu: MenuItemConstructorOptions = {
    label: "Help",
    submenu: [
      {
        label: "Documentation",
        click: (): void => {
          openExternal(DOCUMENTATION_README_URL);
        },
      },
      {
        label: "License",
        click: (): void => {
          openExternal(LICENSE_URL);
        },
      },
      { type: "separator" },
      {
        label: "Check for Updates…",
        click: (): void => {
          onCheckForUpdates();
        },
      },
    ],
  };

  if (process.platform === "darwin") {
    const appMenu: MenuItemConstructorOptions = {
      label: APP_DISPLAY_NAME,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    };

    const fileMenu: MenuItemConstructorOptions = {
      label: "File",
      submenu: [{ role: "close" }],
    };

    const windowMenu: MenuItemConstructorOptions = {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        { type: "separator" },
        { role: "front" },
      ],
    };

    return [appMenu, fileMenu, editMenu, viewMenu, windowMenu, helpMenu];
  }

  const fileMenu: MenuItemConstructorOptions = {
    label: "File",
    submenu: [{ role: "quit" }],
  };

  return [fileMenu, editMenu, viewMenu, helpMenu];
}
