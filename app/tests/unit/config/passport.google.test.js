import { beforeEach, describe, expect, it, vi } from "vitest";

const useMock = vi.fn();
const serializeUserMock = vi.fn();
const deserializeUserMock = vi.fn();

vi.mock("passport", () => ({
  default: {
    use: useMock,
    serializeUser: serializeUserMock,
    deserializeUser: deserializeUserMock,
  },
}));

class LocalStrategyMock {
  constructor(_options, _verify) {
    this.name = "local";
  }
}

class GoogleStrategyMock {
  constructor(_options, verify) {
    this.name = "google";
    this._verify = verify;
  }
}

vi.mock("passport-local", () => ({
  Strategy: LocalStrategyMock,
}));

vi.mock("passport-google-oauth20", () => ({
  Strategy: GoogleStrategyMock,
}));

vi.mock("bcrypt", () => ({
  default: {
    compare: vi.fn(),
  },
}));

vi.mock("../../../models/index.js", () => ({
  User: {
    findOne: vi.fn(),
    create: vi.fn(),
    findByPk: vi.fn(),
  },
  Profile: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
  Wallet: {
    create: vi.fn(),
  },
}));

import { User, Profile, Wallet } from "../../../models/index.js";

describe("passport Google strategy", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.GOOGLE_CLIENT_ID = "web-client";
    process.env.GOOGLE_CLIENT_SECRET = "web-secret";
    process.env.GOOGLE_CALLBACK_URL = "http://localhost:3001/auth/google/callback";
    await import("../../../config/passport.js");
  });

  it("crée user + profile + wallet pour un nouvel utilisateur SSO web", async () => {
    const googleStrategy = useMock.mock.calls
      .map((call) => call[0])
      .find((strategy) => strategy?.name === "google");

    expect(googleStrategy).toBeTruthy();

    User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    User.create.mockResolvedValue({ id: 11, email: "websso@test.com" });
    Profile.create.mockResolvedValue({ id: 22, user_id: 11 });
    Wallet.create.mockResolvedValue({ id: 33, user_id: 11, balance: 0 });

    const done = vi.fn();
    await googleStrategy._verify(
      null,
      null,
      {
        id: "google-web-123",
        displayName: "Web SSO",
        emails: [{ value: "websso@test.com" }],
        photos: [{ value: "https://lh3.googleusercontent.com/photo=s96-c" }],
      },
      done,
    );

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "websso@test.com",
        google_id: "google-web-123",
        is_active: true,
      }),
    );
    expect(Profile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 11,
        is_searchable: true,
      }),
    );
    expect(Wallet.create).toHaveBeenCalledWith({ user_id: 11, balance: 0 });
    expect(done).toHaveBeenCalledWith(null, expect.any(Object));
  });
});
