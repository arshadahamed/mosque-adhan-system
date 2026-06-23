import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../../app.js";

// Isolate from real DB and email
vi.mock("../../../config/db.js", () => {
  const users = new Map<string, any>();
  const settings = new Map<string, any>();
  const tokens = new Map<string, any>();
  const sessions = new Map<string, any>();

  return {
    prisma: {
      user: {
        findUnique: vi.fn(({ where }: any) => {
          if (where.email) return Promise.resolve(users.get(where.email) ?? null);
          if (where.id) return Promise.resolve([...users.values()].find(u => u.id === where.id) ?? null);
          return Promise.resolve(null);
        }),
        create: vi.fn(({ data }: any) => {
          const user = { id: `u_${Math.random()}`, ...data, emailVerified: false, twoFactorEnabled: false, twoFactorSecret: null, status: "active", role: "PUBLIC", createdAt: new Date(), updatedAt: new Date() };
          users.set(user.email, user);
          return Promise.resolve(user);
        }),
        update: vi.fn(({ where, data }: any) => {
          const user = [...users.values()].find(u => u.id === where.id);
          if (!user) return Promise.resolve(null);
          Object.assign(user, data);
          return Promise.resolve(user);
        }),
      },
      refreshToken: {
        create: vi.fn(({ data }: any) => { const t = { id: `rt_${Math.random()}`, ...data, revokedAt: null }; tokens.set(t.tokenHash, t); return Promise.resolve(t); }),
        findUnique: vi.fn(({ where }: any) => Promise.resolve(tokens.get(where.tokenHash) ?? null)),
        update: vi.fn(({ where, data }: any) => { const t = tokens.get(where.id) ?? [...tokens.values()].find(t => t.id === where.id); if (t) Object.assign(t, data); return Promise.resolve(t); }),
        updateMany: vi.fn(({ where, data }: any) => { tokens.forEach(t => { if (t.family === where.family) Object.assign(t, data); }); return Promise.resolve({ count: 1 }); }),
        deleteMany: vi.fn(() => Promise.resolve({ count: 0 })),
      },
      session: {
        upsert: vi.fn(({ create }: any) => { sessions.set(create.id, create); return Promise.resolve(create); }),
        delete: vi.fn(() => Promise.resolve(null)),
      },
      setting: {
        findUnique: vi.fn(({ where }: any) => Promise.resolve(settings.get(where.key) ?? null)),
        upsert: vi.fn(({ where, create }: any) => { settings.set(where.key, { key: where.key, ...create }); return Promise.resolve({ key: where.key, ...create }); }),
        delete: vi.fn(({ where }: any) => { settings.delete(where.key); return Promise.resolve(null); }),
      },
      auditLog: {
        create: vi.fn(() => Promise.resolve({})),
      },
    },
  };
});

vi.mock("../../../lib/email.js", () => ({
  sendMail: vi.fn().mockResolvedValue(undefined),
  emailVerifyHtml: vi.fn(() => "<p>verify</p>"),
  passwordResetHtml: vi.fn(() => "<p>reset</p>"),
}));

const app = createApp();

describe("POST /api/v1/auth/register", () => {
  it("returns 201 with user id and email", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "test@example.com", password: "Password1!" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ email: "test@example.com" });
    expect(res.body.data.id).toBeDefined();
  });

  it("returns 409 when email already exists", async () => {
    await request(app).post("/api/v1/auth/register").send({ email: "dup@example.com", password: "Password1!" });
    const res = await request(app).post("/api/v1/auth/register").send({ email: "dup@example.com", password: "Password1!" });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("returns 400 for invalid email", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({ email: "not-an-email", password: "Password1!" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for short password", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({ email: "x@x.com", password: "short" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/api/v1/auth/register").send({ email: "login@example.com", password: "Password1!" });
  });

  it("returns 401 for wrong password", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email: "login@example.com", password: "WrongPass!" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("returns 401 for unknown email", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email: "nobody@example.com", password: "Password1!" });
    expect(res.status).toBe(401);
  });

  it("returns accessToken and sets refresh cookie on success", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email: "login@example.com", password: "Password1!" });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe("login@example.com");
    const cookies = res.headers["set-cookie"] as string[];
    expect(cookies.some((c: string) => c.startsWith("refresh_token="))).toBe(true);
  });
});

describe("GET /api/v1/auth/me", () => {
  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns user when valid token supplied", async () => {
    await request(app).post("/api/v1/auth/register").send({ email: "me@example.com", password: "Password1!" });
    const loginRes = await request(app).post("/api/v1/auth/login").send({ email: "me@example.com", password: "Password1!" });
    const { accessToken } = loginRes.body.data;

    const res = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("me@example.com");
    expect(res.body.data.passwordHash).toBeUndefined();
    expect(res.body.data.twoFactorSecret).toBeUndefined();
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("clears cookies and returns loggedOut", async () => {
    await request(app).post("/api/v1/auth/register").send({ email: "logout@example.com", password: "Password1!" });
    const loginRes = await request(app).post("/api/v1/auth/login").send({ email: "logout@example.com", password: "Password1!" });
    const cookie = (loginRes.headers["set-cookie"] as string[]).find((c: string) => c.startsWith("refresh_token="))!;

    const res = await request(app).post("/api/v1/auth/logout").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.loggedOut).toBe(true);
  });
});

describe("POST /api/v1/auth/forgot-password", () => {
  it("always returns sent:true (no enumeration)", async () => {
    const res = await request(app).post("/api/v1/auth/forgot-password").send({ email: "nobody@x.com" });
    expect(res.status).toBe(200);
    expect(res.body.data.sent).toBe(true);
  });
});
