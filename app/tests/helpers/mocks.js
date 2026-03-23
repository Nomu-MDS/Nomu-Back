// app/tests/helpers/mocks.js
// Mocks réutilisables pour les tests unitaires

import { vi } from "vitest";

// ─── Mock Request/Response Express ───────────────────────────────────────────

export const createMockReq = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  user: {
    dbUser: {
      id: 1,
      email: "test@test.com",
      name: "Test User",
      role: "user",
      is_active: true,
    },
  },
  ...overrides,
});

export const createMockRes = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    sendStatus: vi.fn().mockReturnThis(),
  };
  return res;
};

// ─── Mock User ───────────────────────────────────────────────────────────────

export const createMockUser = (overrides = {}) => {
  const user = {
    id: 1,
    name: "Test User",
    email: "test@test.com",
    password: "hashedpassword",
    role: "user",
    is_active: true,
    bio: "Test bio",
    location: "Paris",
    created_at: new Date(),
    updated_at: new Date(),
    save: vi.fn().mockResolvedValue(true),
    update: vi.fn().mockResolvedValue(true),
    destroy: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
  // Ajout de toJSON pour compatibilité avec Sequelize
  user.toJSON = () => {
    const { save, update, destroy, toJSON, ...rest } = user;
    return rest;
  };
  return user;
};

// ─── Mock Profile ────────────────────────────────────────────────────────────

export const createMockProfile = (overrides = {}) => ({
  id: 1,
  user_id: 1,
  first_name: "Test",
  last_name: "User",
  age: 25,
  biography: "Test biography",
  country: "France",
  city: "Paris",
  image_url: "profiles/test-image.jpg",
  is_searchable: true,
  save: vi.fn().mockResolvedValue(true),
  update: vi.fn().mockResolvedValue(true),
  destroy: vi.fn().mockResolvedValue(true),
  setInterests: vi.fn().mockResolvedValue(true),
  User: null,
  Interests: [],
  ...overrides,
});

// ─── Mock Wallet ─────────────────────────────────────────────────────────────

export const createMockWallet = (overrides = {}) => ({
  id: 1,
  user_id: 1,
  balance: 100,
  save: vi.fn().mockResolvedValue(true),
  ...overrides,
});

// ─── Mock Reservation ────────────────────────────────────────────────────────

export const createMockReservation = (overrides = {}) => ({
  id: 1,
  title: "Test Reservation",
  conversation_id: 1,
  creator_id: 1,
  price: 50,
  date: new Date(Date.now() + 86400000), // tomorrow
  end_date: new Date(Date.now() + 172800000), // day after tomorrow
  status: "pending",
  save: vi.fn().mockResolvedValue(true),
  destroy: vi.fn().mockResolvedValue(true),
  Conversation: null,
  ...overrides,
});

// ─── Mock Conversation ───────────────────────────────────────────────────────

export const createMockConversation = (overrides = {}) => ({
  id: 1,
  voyager_id: 1,
  local_id: 2,
  ...overrides,
});

// ─── Mock Report ─────────────────────────────────────────────────────────────

export const createMockReport = (overrides = {}) => ({
  id: 1,
  reporter_id: 1,
  reported_user_id: 2,
  reason: "spam",
  message: "Test report message",
  status: "pending",
  save: vi.fn().mockResolvedValue(true),
  destroy: vi.fn().mockResolvedValue(true),
  ...overrides,
});

// ─── Mock Interest ───────────────────────────────────────────────────────────

export const createMockInterest = (overrides = {}) => ({
  id: 1,
  name: "Sport",
  icon: "sport-icon",
  is_active: true,
  save: vi.fn().mockResolvedValue(true),
  destroy: vi.fn().mockResolvedValue(true),
  ...overrides,
});

// ─── Mock Transaction ────────────────────────────────────────────────────────

export const createMockTransaction = (overrides = {}) => ({
  id: 1,
  wallet_id: 1,
  amount: 50,
  type: "credit",
  reason: "Test transaction",
  created_at: new Date(),
  ...overrides,
});
