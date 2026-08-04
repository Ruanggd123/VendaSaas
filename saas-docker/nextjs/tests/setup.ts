import { vi } from "vitest";

// Guard: abort tests unless running against the test environment.
// Prevents any accidental write to production data during test runs.
if (process.env.NODE_ENV !== "test") {
  throw new Error(
    "[TEST SETUP] NODE_ENV is not 'test'. Refusing to run tests outside the test environment."
  );
}

// Tenant sandbox convention: any E2E run touching a real database MUST scope
// every write to a tenant named with the [TESTE-SANDBOX] marker.
export const SANDBOX_TENANT_MARKER = "[TESTE-SANDBOX]";

// Global test timeout
vi.setConfig({ testTimeout: 30000 });
