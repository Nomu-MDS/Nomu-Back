import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("../../../models/index.js", () => ({
  User: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
  Profile: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
  Wallet: {
    create: vi.fn(),
  },
}));

vi.mock("passport", () => ({
  default: {
    authenticate: vi.fn(() => (_req, _res, next) => next()),
  },
}));

vi.mock("../../../services/meilisearch/meiliProfileService.js", () => ({
  indexProfiles: vi.fn().mockResolvedValue(true),
}));

const { verifyIdTokenMock } = vi.hoisted(() => ({
  verifyIdTokenMock: vi.fn(),
}));

vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    verifyIdToken = verifyIdTokenMock;
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn(() => "fake.jwt.token"),
  },
}));

import authRouter from "../../../routes/auth/auth.js";
import { User, Profile, Wallet } from "../../../models/index.js";

describe("POST /auth/google/token", () => {
  const app = express();
  app.use(express.json());
  app.use("/auth", authRouter);

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = "web-client";
    process.env.GOOGLE_MOBILE_CLIENT_ID = "mobile-client";
    process.env.GOOGLE_IOS_CLIENT_ID = "ios-client";
  });

  it("crée user + profile + wallet pour un nouveau compte SSO mobile", async () => {
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({
        sub: "google-123",
        email: "sso@test.com",
        email_verified: true,
        name: "SSO User",
        picture: "https://lh3.googleusercontent.com/photo=s96-c",
      }),
    });

    User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    User.create.mockResolvedValue({ id: 10, email: "sso@test.com", name: "SSO User" });
    Profile.create.mockResolvedValue({ id: 20, user_id: 10 });
    Wallet.create.mockResolvedValue({ id: 30, user_id: 10, balance: 0 });

    const res = await request(app)
      .post("/auth/google/token")
      .send({ id_token: "id-token-google" });

    expect(res.status).toBe(200);
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "sso@test.com",
        google_id: "google-123",
        is_active: true,
      }),
    );
    expect(Profile.create).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 10, is_searchable: true }),
    );
    expect(Wallet.create).toHaveBeenCalledWith({ user_id: 10, balance: 0 });
    expect(res.body).toEqual(
      expect.objectContaining({
        token: "fake.jwt.token",
        refreshToken: "fake.jwt.token",
        is_new_user: true,
      }),
    );
  });
});
