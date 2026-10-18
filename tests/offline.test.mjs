import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, it, expect, vi } from "vitest";
import { renderServiceWorker } from "../scripts/precache-worker.mjs";
const template = readFileSync(
  new URL("../public/sw.js", import.meta.url),
  "utf8",
);
function worker() {
  const handlers = {},
    stored = new Map(),
    pending = [];
  const cache = {
    addAll: vi.fn(async (paths) => {
      for (const path of paths) stored.set(path, new Response(path));
    }),
    match: vi.fn(async (request, options) => {
      // Preview responses vary by Origin. Anonymous crossorigin asset requests
      // differ from the install-time request, while their static bytes do not.
      if (
        typeof request !== "string" &&
        request.headers?.Origin &&
        !options?.ignoreVary
      )
        return undefined;
      return stored
        .get(
          typeof request === "string" ? request : new URL(request.url).pathname,
        )
        ?.clone();
    }),
    put: vi.fn(async (request, response) =>
      stored.set(
        typeof request === "string" ? request : new URL(request.url).pathname,
        response,
      ),
    ),
  };
  const fetch = vi.fn().mockRejectedValue(new TypeError("Offline"));
  const caches = {
    open: vi.fn(async () => cache),
    keys: vi.fn(async () => [
      "unrelated-app",
      "mizu-shell-old",
      "mizu-shell-test",
    ]),
    delete: vi.fn().mockResolvedValue(true),
  };
  const self = {
    location: { origin: "https://mizu.test" },
    addEventListener: (name, handler) => {
      handlers[name] = handler;
    },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  };
  runInNewContext(
    renderServiceWorker(
      template,
      [
        "/assets/app-abc.js",
        "/assets/app-def.css",
        "/icon.svg",
        "/api/me",
        "/auth/google",
      ],
      "test",
    ),
    { self, caches, fetch, URL, Response },
  );
  return {
    handlers,
    cache,
    caches,
    fetch,
    self,
    pending,
    event(request) {
      let response;
      return {
        request,
        waitUntil: (p) => pending.push(p),
        respondWith: (p) => {
          response = p;
        },
        get response() {
          return response;
        },
      };
    },
  };
}
describe("offline app shell", () => {
  it("installs JS and CSS before claiming clients; excludes identity endpoints", async () => {
    const w = worker();
    w.handlers.install({ waitUntil: (p) => w.pending.push(p) });
    await Promise.all(w.pending);
    expect(w.cache.addAll.mock.calls[0][0]).toEqual([
      "/",
      "/assets/app-abc.js",
      "/assets/app-def.css",
      "/icon.svg",
    ]);
    expect(w.self.skipWaiting).toHaveBeenCalled();
  });
  it("reloads immediately offline after the first completed installation", async () => {
    const w = worker();
    w.handlers.install({ waitUntil: (p) => w.pending.push(p) });
    await Promise.all(w.pending);
    const nav = w.event({
      url: "https://mizu.test/",
      method: "GET",
      mode: "navigate",
    });
    w.handlers.fetch(nav);
    expect(await (await nav.response).text()).toBe("/");
    for (const path of ["/assets/app-abc.js", "/assets/app-def.css"]) {
      const resource = w.event({
        url: "https://mizu.test" + path,
        method: "GET",
        mode: "cors",
        headers: { Origin: "https://mizu.test" },
      });
      w.handlers.fetch(resource);
      expect(await (await resource.response).text()).toBe(path);
    }
    await Promise.all(w.pending);
  });
  it("never intercepts authentication, private data, writes or external resources", () => {
    const w = worker();
    for (const [url, method] of [
      ["https://mizu.test/api/me", "GET"],
      ["https://mizu.test/auth/google", "GET"],
      ["https://mizu.test/api/tasks/sync", "POST"],
      ["https://fonts.test/font.woff2", "GET"],
    ]) {
      const event = w.event({ url, method });
      w.handlers.fetch(event);
      expect(event.response).toBeUndefined();
    }
    expect(w.fetch).not.toHaveBeenCalled();
  });
  it("keeps one installed revision when newer HTML is available online", async () => {
    const w = worker();
    w.handlers.install({ waitUntil: (p) => w.pending.push(p) });
    await Promise.all(w.pending);
    w.fetch.mockResolvedValue(new Response("new HTML requiring new assets"));
    const event = w.event({
      url: "https://mizu.test/",
      method: "GET",
      mode: "navigate",
    });
    w.handlers.fetch(event);
    expect(await (await event.response).text()).toBe("/");
    expect(await (await w.cache.match("/")).text()).toBe("/");
  });
  it("removes only outdated mizu caches", async () => {
    const w = worker();
    w.handlers.activate({ waitUntil: (p) => w.pending.push(p) });
    await Promise.all(w.pending);
    expect(w.caches.delete).toHaveBeenCalledExactlyOnceWith("mizu-shell-old");
    expect(w.self.clients.claim).toHaveBeenCalled();
  });
  it("keeps the cached shell usable when navigation has not completed", async () => {
    const w = worker();
    w.handlers.install({ waitUntil: (p) => w.pending.push(p) });
    await Promise.all(w.pending);
    w.fetch.mockImplementation(() => new Promise(() => {}));
    const event = w.event({
      url: "https://mizu.test/",
      method: "GET",
      mode: "navigate",
    });
    w.handlers.fetch(event);
    expect(await (await event.response).text()).toBe("/");
  });
});
