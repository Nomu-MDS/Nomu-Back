// app/tests/auth.test.js
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "./testApp.js";
import { sequelize } from "../config/database.js";

const app = createApp();

beforeAll(async () => {
  await sequelize.authenticate();
  // force: true recrée toutes les tables à zéro pour avoir un état propre
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

// ─── Health ───────────────────────────────────────────────────────────────────

describe("GET /health", () => {
  it("répond 200", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
  });
});

// ─── Signup ───────────────────────────────────────────────────────────────────

describe("POST /auth/signup", () => {
  it("crée un utilisateur et retourne 201 avec un token", async () => {
    const res = await request(app).post("/auth/signup").send({
      name: "Jean Test",
      email: "jean@test.com",
      password: "password123",
      is_searchable: false, // évite tout appel à Meilisearch
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("user");
    expect(res.body.user.email).toBe("jean@test.com");
  });

  it("refuse un email déjà utilisé (409)", async () => {
    const res = await request(app).post("/auth/signup").send({
      name: "Jean Doublon",
      email: "jean@test.com", // même email que le test précédent
      password: "autrepassword",
      is_searchable: false,
    });

    expect(res.status).toBe(409);
  });

  it("ne renvoie pas le mot de passe dans la réponse", async () => {
    const res = await request(app).post("/auth/signup").send({
      name: "Marie Test",
      email: "marie@test.com",
      password: "secret123",
      is_searchable: false,
    });

    expect(res.status).toBe(201);
    expect(res.body.user).not.toHaveProperty("password");
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────

describe("POST /auth/login", () => {
  it("connecte un utilisateur existant et retourne un token (200)", async () => {
    const res = await request(app).post("/auth/login").send({
      email: "jean@test.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("user");
  });

  it("refuse un mauvais mot de passe (401)", async () => {
    const res = await request(app).post("/auth/login").send({
      email: "jean@test.com",
      password: "mauvaismdp",
    });

    expect(res.status).toBe(401);
  });

  it("refuse un email inconnu (401)", async () => {
    const res = await request(app).post("/auth/login").send({
      email: "inconnu@test.com",
      password: "password123",
    });

    expect(res.status).toBe(401);
  });
});
