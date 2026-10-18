import { describe, it, expect, vi } from "vitest";
import { SignJWT } from "jose";
import { app } from "../worker";
const origin = "https://mizu.test";
const secret = "test-only-32-character-secret-for-unit-tests";
async function session(id = "alice") {
  return new SignJWT({ sub: id, name: id, email: id + "@example.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("mizu")
    .setAudience("mizu")
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(secret));
}
const makeEnv = () => ({
  SESSION_SECRET: secret,
  DB: {
    prepare: vi.fn(() => ({
      bind: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue({ results: [] }),
      first: vi.fn().mockResolvedValue({ count: 1 }),
    })),
    batch: vi.fn().mockResolvedValue([]),
  },
  AI: { run: vi.fn() },
});
describe("Worker access boundaries", () => {
  it("reports Google unavailable without credentials", async () => {
    const r = await app.request(origin + "/api/config", {}, {});
    expect(await r.json()).toEqual({ google: false, ai: false, cloud: false });
  });
  it("exposes anonymous session without requiring login", async () => {
    const r = await app.request(origin + "/api/me", {}, {});
    expect(await r.json()).toEqual({ user: null });
  });
  it("rejects anonymous writes", async () => {
    const r = await app.request(
      origin + "/api/tasks/sync",
      { method: "POST", headers: { Origin: origin }, body: '{"tasks":[]}' },
      makeEnv(),
    );
    expect(r.status).toBe(401);
  });
  it("rejects cross-origin writes before DB access", async () => {
    const env = makeEnv();
    const r = await app.request(
      origin + "/api/tasks/sync",
      { method: "POST", headers: { Origin: "https://evil.test" }, body: "{}" },
      env,
    );
    expect(r.status).toBe(403);
    expect(env.DB.prepare).not.toHaveBeenCalled();
  });
  it("rejects invalid sessions", async () => {
    const r = await app.request(
      origin + "/api/me",
      { headers: { Cookie: "mizu_session=forged" } },
      makeEnv(),
    );
    expect(await r.json()).toEqual({ user: null });
  });
  it("reads signed sessions", async () => {
    const r = await app.request(
      origin + "/api/me",
      { headers: { Cookie: "mizu_session=" + (await session()) } },
      makeEnv(),
    );
    expect(((await r.json()) as { user: { id: string } }).user.id).toBe(
      "alice",
    );
  });
  it("rejects malformed tasks", async () => {
    const env = makeEnv();
    const r = await app.request(
      origin + "/api/tasks/sync",
      {
        method: "POST",
        headers: {
          Origin: origin,
          Cookie: "mizu_session=" + (await session()),
        },
        body: '{"tasks":[{"title":"bad"}]}',
      },
      env,
    );
    expect(r.status).toBe(400);
    expect(env.DB.batch).not.toHaveBeenCalled();
  });
  it("scopes queries to the signed-in user", async () => {
    const env = makeEnv();
    const r = await app.request(
      origin + "/api/tasks/sync",
      {
        method: "POST",
        headers: {
          Origin: origin,
          Cookie: "mizu_session=" + (await session("alice")),
        },
        body: '{"tasks":[]}',
      },
      env,
    );
    expect(r.status).toBe(200);
    expect(env.DB.prepare.mock.results[0].value.bind).toHaveBeenCalledWith(
      "alice",
    );
  });
  it("requires login for AI", async () => {
    const env = makeEnv();
    const r = await app.request(
      origin + "/api/ai/organize",
      { method: "POST", headers: { Origin: origin }, body: "{}" },
      env,
    );
    expect(r.status).toBe(401);
    expect(env.AI.run).not.toHaveBeenCalled();
  });
  it("enforces AI usage limit without inference", async () => {
    const env = makeEnv();
    env.DB.prepare = vi.fn(() => ({
      bind: vi.fn().mockReturnThis(),
      all: vi.fn(),
      first: vi.fn().mockResolvedValue(null),
    }));
    const r = await app.request(
      origin + "/api/ai/organize",
      {
        method: "POST",
        headers: {
          Origin: origin,
          Cookie: "mizu_session=" + (await session()),
        },
        body: JSON.stringify({ text: "test", today: "2026-10-18" }),
      },
      env,
    );
    expect(r.status).toBe(429);
    expect(env.AI.run).not.toHaveBeenCalled();
  });
  it("rejects malformed AI output", async () => {
    const env = makeEnv();
    env.AI.run.mockResolvedValue({ response: "not json" });
    const r = await app.request(
      origin + "/api/ai/organize",
      {
        method: "POST",
        headers: {
          Origin: origin,
          Cookie: "mizu_session=" + (await session()),
        },
        body: JSON.stringify({ text: "test", today: "2026-10-18" }),
      },
      env,
    );
    expect(r.status).toBe(502);
  });
  it("returns validated AI suggestions using a mocked binding", async () => {
    const env = makeEnv();
    env.AI.run.mockResolvedValue({
      response: JSON.stringify({ tasks: [{ title: "資料を確認", due: "" }] }),
    });
    const r = await app.request(
      origin + "/api/ai/organize",
      {
        method: "POST",
        headers: {
          Origin: origin,
          Cookie: "mizu_session=" + (await session()),
        },
        body: JSON.stringify({ text: "test", today: "2026-10-18" }),
      },
      env,
    );
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({
      tasks: [{ title: "資料を確認", due: "" }],
    });
  });
  it("fails closed for unconfigured Google OAuth", async () => {
    const r = await app.request(origin + "/auth/google", {}, {});
    expect(r.status).toBe(503);
  });
  it("does not cache private API responses", async () => {
    const r = await app.request(origin + "/api/me", {}, {});
    expect(r.headers.get("Cache-Control")).toBe("no-store");
  });
});
