import { test } from "node:test";
import assert from "node:assert/strict";
import { mapAchievements, formatAchievementLabel, type AchievementRow } from "@/lib/achievements/achievements-aggregation";

test("formatAchievementLabel prefers metadata.label when present", () => {
  const label = formatAchievementLabel("first_practice", { label: "First Practice Set!" });
  assert.equal(label, "First Practice Set!");
});

test("formatAchievementLabel falls back to a readable formatting of achievement_type", () => {
  assert.equal(formatAchievementLabel("first_practice", {}), "First practice");
  assert.equal(formatAchievementLabel("seven-day-streak", {}), "Seven day streak");
});

test("formatAchievementLabel ignores a non-string or blank metadata.label", () => {
  assert.equal(formatAchievementLabel("first_practice", { label: "   " }), "First practice");
  assert.equal(formatAchievementLabel("first_practice", { label: 42 }), "First practice");
});

test("mapAchievements preserves row order (query already sorts chronological)", () => {
  const rows: AchievementRow[] = [
    { id: "a1", achievementType: "first_practice", earnedAt: "2026-01-01T00:00:00Z", metadata: {} },
    { id: "a2", achievementType: "seven_day_streak", earnedAt: "2026-01-08T00:00:00Z", metadata: {} },
  ];
  const items = mapAchievements(rows);
  assert.deepEqual(items.map((i) => i.id), ["a1", "a2"]);
  assert.equal(items[0].label, "First practice");
  assert.equal(items[1].label, "Seven day streak");
});
