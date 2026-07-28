import assert from "node:assert/strict";
import { attendanceUsageKey, attendanceUsagePrefix } from "./usage";

assert.equal(attendanceUsagePrefix("tenant-1", "2026-07"), "usage_attendance_tenant-1_2026-07_");
assert.equal(
  attendanceUsageKey("tenant-1", "instance-a", "5511999999999", "2026-07"),
  attendanceUsageKey("tenant-1", "instance-a", "5511999999999", "2026-07"),
);
assert.notEqual(
  attendanceUsageKey("tenant-1", "instance-a", "5511999999999", "2026-07"),
  attendanceUsageKey("tenant-1", "instance-b", "5511999999999", "2026-07"),
);

console.log("usage tests passed");
