import { readTasks, type Task } from "./model";

export type User = { id: string; name: string; email: string };
export type Workspace = { key: string; items: Task[] };
const activeUserKey = "mizu:active-user";
const guestKey = "mizu:tasks:guest";

// This cache only selects local data. The Worker authenticates every request.
export function readLastUser(): User | null {
  try {
    const value = JSON.parse(localStorage.getItem(activeUserKey) || "null");
    return value &&
      [value.id, value.name, value.email].every((v) => typeof v === "string")
      ? value
      : null;
  } catch {
    return null;
  }
}

export function rememberUser(user: User | null) {
  try {
    if (user) localStorage.setItem(activeUserKey, JSON.stringify(user));
    else localStorage.removeItem(activeUserKey);
  } catch {
    // Task persistence reports storage failures in the main UI.
  }
}

export function workspaceForUser(
  user: User | null,
  current?: Workspace,
): Workspace {
  const key = user ? `mizu:tasks:${user.id}` : guestKey;
  if (current?.key === key) return current;
  const personal = readTasks(key);
  const guest = user && current?.key === guestKey ? current.items : [];
  return {
    key,
    items: [
      ...personal,
      ...guest.filter((task) => !personal.some((p) => p.id === task.id)),
    ],
  };
}
