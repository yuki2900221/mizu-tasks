import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newTask } from "../src/model";
import { readLastUser, rememberUser, workspaceForUser } from "../src/workspace";

const user = { id: "account-a", name: "A", email: "a@example.test" };
describe("offline account workspace", () => {
  beforeEach(() => {
    const entries = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => entries.set(key, value),
      removeItem: (key: string) => entries.delete(key),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("restores the signed-in workspace after offline reload", () => {
    const task = newTask("offline edit");
    rememberUser(user);
    localStorage.setItem("mizu:tasks:account-a", JSON.stringify([task]));
    expect(workspaceForUser(readLastUser()).items).toEqual([task]);
  });
  it("keeps unsaved in-memory changes when the same session is revalidated", () => {
    const current = { key: "mizu:tasks:account-a", items: [newTask("new")] };
    expect(workspaceForUser(user, current)).toBe(current);
  });
  it("migrates guest notes only to the account that logs in", () => {
    const task = newTask("guest");
    const signedIn = workspaceForUser(user, {
      key: "mizu:tasks:guest",
      items: [task],
    });
    expect(signedIn.items).toEqual([task]);
    expect(
      workspaceForUser({ ...user, id: "account-b" }, signedIn).items,
    ).toEqual([]);
  });
  it("forgets the active account on logout without erasing its saved tasks", () => {
    const task = newTask("private");
    localStorage.setItem("mizu:tasks:account-a", JSON.stringify([task]));
    rememberUser(user);
    rememberUser(null);
    expect(readLastUser()).toBeNull();
    expect(workspaceForUser(readLastUser()).items).toEqual([]);
    expect(workspaceForUser(user).items).toEqual([task]);
  });
  it("rejects damaged cached identities", () => {
    localStorage.setItem("mizu:active-user", '{"id": 123}');
    expect(readLastUser()).toBeNull();
  });
});
