import { vi } from "vitest";

// Guard: refuse to run tests against production data
if (process.env.NODE_ENV !== "test") {
  console.warn("[TEST SETUP] NODE_ENV is not 'test'. Tests may touch production data!");
}

// Global test timeout
vi.setConfig({ testTimeout: 30000 });
