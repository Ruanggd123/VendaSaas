import assert from "node:assert/strict";
import {
  formatBusinessDateKey,
  formatBusinessTime,
  getBusinessDayRange,
  zonedDateTimeToUtc,
} from "./dateTime";

const appointment = zonedDateTimeToUtc({
  year: 2026,
  month: 7,
  day: 29,
  hour: 16,
  minute: 30,
});

assert.equal(appointment.toISOString(), "2026-07-29T19:30:00.000Z");
assert.equal(formatBusinessTime(appointment), "16:30");
assert.equal(formatBusinessDateKey(appointment), "2026-07-29");

const range = getBusinessDayRange(appointment);
assert.equal(range.start.toISOString(), "2026-07-29T03:00:00.000Z");
assert.equal(range.end.toISOString(), "2026-07-30T02:59:59.000Z");

console.log("dateTime tests passed");
