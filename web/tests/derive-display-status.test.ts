import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveDisplayStatus } from "@/lib/parent-links/derive-display-status";

test("deriveDisplayStatus keeps 'pending' when expires_at is in the future", () => {
  const now = new Date("2026-01-10T00:00:00Z");
  assert.equal(deriveDisplayStatus("pending", "2026-01-20T00:00:00Z", now), "pending");
});

test("deriveDisplayStatus reports 'expired' for a pending row past its expires_at", () => {
  const now = new Date("2026-01-10T00:00:00Z");
  assert.equal(deriveDisplayStatus("pending", "2026-01-01T00:00:00Z", now), "expired");
});

test("deriveDisplayStatus never overrides a terminal status even if expires_at is in the past", () => {
  const now = new Date("2026-01-10T00:00:00Z");
  assert.equal(deriveDisplayStatus("verified", "2026-01-01T00:00:00Z", now), "verified");
  assert.equal(deriveDisplayStatus("rejected", "2026-01-01T00:00:00Z", now), "rejected");
  assert.equal(deriveDisplayStatus("revoked", "2026-01-01T00:00:00Z", now), "revoked");
});
