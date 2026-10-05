import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeTopicLabel, buildLearnerTopics, suggestTopics, type TopicRow } from "@/lib/learner-topics/learner-topics-aggregation";

const row = (over: Partial<TopicRow>): TopicRow => ({
  traceId: "t",
  topic: "Trigonometry",
  subtopic: null,
  askedAt: "2026-10-01T10:00:00Z",
  source: null,
  question: "q",
  ...over,
});

test("normalizes router labels into single topics", () => {
  assert.equal(normalizeTopicLabel("Trigonometry"), "Trigonometry");
  assert.equal(normalizeTopicLabel("Force"), "Force");
  assert.equal(normalizeTopicLabel("Addition / Two-digit"), "Addition");
  assert.equal(normalizeTopicLabel("Area"), "Area");
});

test("drops labels that are not subjects", () => {
  assert.equal(normalizeTopicLabel("Language Setting"), null);
  assert.equal(normalizeTopicLabel("Language and response style preference"), null);
  assert.equal(normalizeTopicLabel("-"), null);
  assert.equal(normalizeTopicLabel(null), null);
});

test("counts each question once and excludes AI Tutor's automatic turns", () => {
  const topics = buildLearnerTopics([
    row({ traceId: "a", topic: "Addition", source: "tutor_auto", question: "Can you explain Addition?" }),
    row({ traceId: "b", topic: "Addition", source: "tutor_auto", question: "Can you explain Addition?" }),
    row({ traceId: "c", topic: "Trigonometry", question: "What is sine?" }),
    row({ traceId: "c", topic: "Trigonometry", question: "What is sine?" }),
    row({ traceId: "d", topic: "Trigonometry", subtopic: "SOH-CAH-TOA", question: "Explain tangent" }),
  ]);
  assert.deepEqual(topics.map((t) => [t.label, t.askCount]), [["Trigonometry", 2]]);
  assert.deepEqual(topics[0].subtopics, ["SOH-CAH-TOA"]);
});

test("recent questions are unique and newest first", () => {
  const [topic] = buildLearnerTopics([
    row({ traceId: "1", askedAt: "2026-10-01T10:00:00Z", question: "Old question" }),
    row({ traceId: "2", askedAt: "2026-10-03T10:00:00Z", question: "New question" }),
    row({ traceId: "3", askedAt: "2026-10-03T11:00:00Z", question: "new question" }),
  ]);
  assert.deepEqual(topic.recentQuestions, ["new question", "Old question"]);
});

test("suggestions pick up topics asked before but not recently, most asked first", () => {
  const now = new Date("2026-10-10T12:00:00Z");
  const topics = buildLearnerTopics([
    row({ traceId: "1", topic: "Area", askedAt: "2026-10-09T10:00:00Z" }),
    row({ traceId: "2", topic: "Trigonometry", askedAt: "2026-10-01T10:00:00Z" }),
    row({ traceId: "3", topic: "Trigonometry", askedAt: "2026-10-02T10:00:00Z" }),
    row({ traceId: "4", topic: "Force", askedAt: "2026-09-20T10:00:00Z" }),
  ]);
  const suggestions = suggestTopics(topics, now);
  assert.deepEqual(suggestions.map((s) => s.label), ["Trigonometry", "Force"]);
  assert.equal(suggestions[0].reason, "Asked 2 times, last 8 days ago");
});
