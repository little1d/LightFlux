import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  desktop: false,
  invoke: vi.fn(),
  storage: new Map<string, string>(),
}));
vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => mocks.desktop,
  invoke: mocks.invoke,
}));
vi.mock("expo-file-system", () => ({
  File: class {},
  Paths: { document: "" },
}));
vi.mock("react-native", () => ({ Platform: { OS: "web" } }));
vi.mock("../services/indexedDbStorage", () => ({
  loadWebState: async (key: string) => mocks.storage.get(key) ?? null,
  saveWebState: async (key: string, value: string) =>
    mocks.storage.set(key, value),
}));

import { loadAppState, parsePersistedAppState, saveAppState } from "../services/todoStorage";

const raw = JSON.stringify({
  schemaVersion: 12,
  todos: [],
  projects: [],
  updatedAt: 1,
});

describe("local-only startup and persistence", () => {
  beforeEach(() => {
    mocks.desktop = false;
    mocks.invoke.mockReset();
    mocks.storage.clear();
  });

  it("starts locally without touching the network", async () => {
    const network = vi.fn(() => {
      throw new Error("Network must not be used");
    });
    vi.stubGlobal("fetch", network);
    mocks.storage.set("lightflux.app-state.v12", raw);
    const state = await loadAppState();
    expect(state?.schemaVersion).toBe(12);
    await saveAppState(state!);
    expect(network).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("migrates the WebView V12 snapshot to desktop without deleting its source", async () => {
    mocks.desktop = true;
    mocks.storage.set("lightflux.app-state.v12", raw);
    mocks.invoke.mockResolvedValue(null);
    expect((await loadAppState())?.schemaVersion).toBe(12);
    expect(mocks.invoke).toHaveBeenCalledWith("save_local_app_state", {
      content: raw,
    });
    expect(mocks.storage.get("lightflux.app-state.v12")).toBe(raw);
  });

  it("prefers the authoritative desktop file and fails closed on corruption", async () => {
    mocks.desktop = true;
    mocks.storage.set("lightflux.app-state.v12", raw);
    mocks.invoke.mockResolvedValue("broken");
    await expect(loadAppState()).rejects.toThrow("preserved");
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });

  it("does not overwrite or remove unsupported legacy data", async () => {
    mocks.storage.set("current", '{"schemaVersion":11}');
    await expect(loadAppState()).rejects.toThrow("not been deleted");
    expect(mocks.storage.has("current")).toBe(true);
  });

  it("refuses migration that would discard malformed task records", async () => {
    const broken = JSON.stringify({
      schemaVersion: 12,
      todos: [{ id: "important" }],
      projects: [],
    });
    mocks.storage.set("lightflux.app-state.v12", broken);
    await expect(loadAppState()).rejects.toThrow("invalid records");
    expect(mocks.storage.get("lightflux.app-state.v12")).toBe(broken);
  });

  it("serializes saves and propagates disk failures", async () => {
    mocks.desktop = true;
    const state = parsePersistedAppState(raw)!;
    mocks.invoke
      .mockRejectedValueOnce(new Error("Disk full"))
      .mockResolvedValue(undefined);
    await expect(saveAppState(state)).rejects.toThrow("Disk full");
    await expect(saveAppState(state)).resolves.toEqual(state);
  });
});
