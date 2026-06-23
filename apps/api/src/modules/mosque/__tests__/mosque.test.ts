import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../../../app.js";
import { signAccessToken } from "../../../lib/jwt.js";

// ─── DB mock ─────────────────────────────────────────────────────────────────
const mosques = new Map<string, any>();
const mosqueUsers = new Map<string, any>();
let idSeq = 0;

vi.mock("../../../config/db.js", () => ({
  prisma: {
    mosque: {
      findMany: vi.fn(({ where, skip = 0, take = 20 }: any) => {
        let list = [...mosques.values()];
        if (where?.OR) {
          const q = where.OR[0].name.contains.toLowerCase();
          list = list.filter(m => m.name.toLowerCase().includes(q));
        }
        if (where?.countryCode) list = list.filter(m => m.countryCode === where.countryCode);
        return Promise.resolve(list.slice(skip, skip + take));
      }),
      count: vi.fn(() => Promise.resolve(mosques.size)),
      findUnique: vi.fn(({ where }: any) => {
        const m = where.slug ? [...mosques.values()].find(m => m.slug === where.slug) : mosques.get(where.id);
        return Promise.resolve(m ? { ...m, config: {}, subscription: {} } : null);
      }),
      create: vi.fn(({ data }: any) => {
        const id = `mosque_${++idSeq}`;
        const m = { id, ...data, status: "OFFLINE", createdAt: new Date(), updatedAt: new Date(), config: {}, subscription: {} };
        mosques.set(id, m);
        return Promise.resolve(m);
      }),
      update: vi.fn(({ where, data }: any) => {
        const m = mosques.get(where.id);
        if (m) { Object.assign(m, data); mosques.set(where.id, m); }
        return Promise.resolve(m ? { ...m, config: {} } : null);
      }),
      delete: vi.fn(({ where }: any) => { const m = mosques.get(where.id); mosques.delete(where.id); return Promise.resolve(m); }),
    },
    mosqueConfig: {
      upsert: vi.fn(() => Promise.resolve({})),
    },
    mosqueUser: {
      findMany: vi.fn(() => Promise.resolve([])),
      findUnique: vi.fn(({ where }: any) => {
        const key = `${where.userId_mosqueId.userId}:${where.userId_mosqueId.mosqueId}`;
        return Promise.resolve(mosqueUsers.get(key) ?? null);
      }),
      upsert: vi.fn(({ where, create }: any) => {
        const key = `${where.userId_mosqueId.userId}:${where.userId_mosqueId.mosqueId}`;
        mosqueUsers.set(key, create);
        return Promise.resolve(create);
      }),
      delete: vi.fn(() => Promise.resolve(null)),
    },
    subscription: { create: vi.fn(() => Promise.resolve({})) },
    auditLog: { create: vi.fn(() => Promise.resolve({})) },
    $transaction: vi.fn((args: any[]) => Promise.all(args)),
  },
}));

vi.mock("../../../lib/email.js", () => ({
  sendMail: vi.fn().mockResolvedValue(undefined),
  emailVerifyHtml: vi.fn(() => ""),
  passwordResetHtml: vi.fn(() => ""),
}));

// ─── Tokens ───────────────────────────────────────────────────────────────────
const adminToken = signAccessToken({ sub: "user_admin", email: "admin@x.com", role: "SUPER_ADMIN" });
const staffToken  = signAccessToken({ sub: "user_staff",  email: "staff@x.com",  role: "STAFF" });

const app = createApp();

const newMosque = {
  name: "Test Masjid",
  address: "123 Main St",
  city: "Colombo",
  zipcode: "00100",
  countryCode: "LK",
  latitude: 6.9271,
  longitude: 79.8612,
  timezone: "Asia/Colombo",
};

describe("GET /api/v1/mosques", () => {
  it("returns paginated list (public)", async () => {
    const res = await request(app).get("/api/v1/mosques");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toHaveProperty("total");
  });
});

describe("POST /api/v1/mosques", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/v1/mosques").send(newMosque);
    expect(res.status).toBe(401);
  });

  it("returns 403 for STAFF role", async () => {
    const res = await request(app)
      .post("/api/v1/mosques")
      .set("Authorization", `Bearer ${staffToken}`)
      .send(newMosque);
    expect(res.status).toBe(403);
  });

  it("creates mosque as SUPER_ADMIN", async () => {
    const res = await request(app)
      .post("/api/v1/mosques")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(newMosque);
    expect(res.status).toBe(201);
    expect(res.body.data.slug).toBe("test-masjid");
    expect(res.body.data.name).toBe("Test Masjid");
  });

  it("returns 400 for missing required fields", async () => {
    const res = await request(app)
      .post("/api/v1/mosques")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "X" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/mosques/:slug", () => {
  it("returns 404 for unknown slug", async () => {
    const res = await request(app).get("/api/v1/mosques/does-not-exist");
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/v1/mosques/:id/config/:section", () => {
  it("returns 400 for invalid section", async () => {
    const res = await request(app)
      .patch("/api/v1/mosques/mosque_1/config/invalid_section")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ foo: "bar" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_SECTION");
  });

  it("updates config section as SUPER_ADMIN", async () => {
    const res = await request(app)
      .patch("/api/v1/mosques/mosque_1/config/display")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ theme: "dark" });
    expect(res.status).toBe(200);
  });
});
