import { describe, it, expect, vi } from "vitest";
import { buildAppMenuTemplate } from "./build-app-menu-template";

describe("buildAppMenuTemplate", () => {
  const opts = {
    includeDevViewItems: false,
    onCheckForUpdates: vi.fn(),
    openExternal: vi.fn(),
  };

  it("includes Help documentation items and check for updates", () => {
    const template = buildAppMenuTemplate(opts);
    const help = template.find((m) => m.label === "Help");
    expect(help?.submenu).toBeDefined();
    const labels = (help?.submenu as { label?: string }[])
      ?.map((x) => x.label)
      .filter(Boolean);
    expect(labels).toContain("Documentation");
    expect(labels).toContain("License");
    expect(labels).toContain("Check for Updates…");
  });

  it("includes dev-only View items when requested", () => {
    const withDev = buildAppMenuTemplate({
      ...opts,
      includeDevViewItems: true,
    });
    const view = withDev.find((m) => m.label === "View");
    const roles = (view?.submenu as { role?: string }[])
      ?.map((x) => x.role)
      .filter(Boolean);
    expect(roles).toContain("toggleDevTools");
  });

  it("omits dev View items when not in development", () => {
    const noDev = buildAppMenuTemplate({
      ...opts,
      includeDevViewItems: false,
    });
    const view = noDev.find((m) => m.label === "View");
    const roles = (view?.submenu as { role?: string }[])
      ?.map((x) => x.role)
      .filter(Boolean);
    expect(roles).not.toContain("toggleDevTools");
  });

  it("darwin template starts with app-named menu", () => {
    const original = process.platform;
    Object.defineProperty(process, "platform", { value: "darwin" });
    try {
      const template = buildAppMenuTemplate(opts);
      expect(template[0]?.label).toBe("AI Media Library");
      expect(template.some((m) => m.label === "Window")).toBe(true);
    } finally {
      Object.defineProperty(process, "platform", { value: original });
    }
  });

  it("win32 template has File → Exit", () => {
    const original = process.platform;
    Object.defineProperty(process, "platform", { value: "win32" });
    try {
      const template = buildAppMenuTemplate(opts);
      const file = template.find((m) => m.label === "File");
      const sub = file?.submenu;
      expect(Array.isArray(sub) ? sub.length : 0).toBeGreaterThan(0);
    } finally {
      Object.defineProperty(process, "platform", { value: original });
    }
  });
});
