import { test } from "node:test";
import assert from "node:assert/strict";
import { createConceptExplanationExtractor } from "@/lib/agents/concept-explanation-extractor";
import { formatTeachingResponseAsReply, type TeachingResponse } from "@/lib/agents/concept-agent";

const CORPUS: Array<{ name: string; text: string }> = [
  {
    name: "plain fields",
    text: JSON.stringify({ concept: "Subtraction", explanation: "Borrow 1 ten.", example: "42 - 17 = 25", nextStep: "Practice", confidence: 0.84 }),
  },
  {
    name: "escaped quotes and backslashes",
    text: JSON.stringify({ concept: "c", explanation: 'Say "borrow" and use a \\ slash.', example: 'He wrote "42 - 17".', nextStep: "Practice", confidence: 0.5 }),
  },
  {
    name: "control escapes",
    text: JSON.stringify({ concept: "c", explanation: "line one\nline two\tTabbed\rCR\bBS\fFF", example: "e", nextStep: "Summary", confidence: 1 }),
  },
  {
    name: "unicode escapes",
    text: '{"concept":"c","explanation":"caf\\u00e9 \\u20b9 ok","example":"\\u0041B","nextStep":"Practice","confidence":0.1}',
  },
  {
    name: "escaped surrogate pair",
    text: '{"concept":"c","explanation":"smile \\ud83d\\ude00 done","example":"x","nextStep":"Practice","confidence":0.1}',
  },
  {
    name: "raw emoji",
    text: JSON.stringify({ concept: "c", explanation: "smile 😀 done", example: "🙂", nextStep: "Practice", confidence: 0.1 }),
  },
  {
    name: "empty example",
    text: JSON.stringify({ concept: "c", explanation: "Only an explanation.", example: "", nextStep: "Practice", confidence: 0.9 }),
  },
  {
    name: "empty explanation with example",
    text: JSON.stringify({ concept: "c", explanation: "", example: "Use 5 - 2.", nextStep: "Practice", confidence: 0.9 }),
  },
  {
    name: "other fields contain the key text",
    text: JSON.stringify({ concept: '"explanation": "fake"', explanation: "Real one.", example: '"example": "also fake"', nextStep: "Practice", confidence: 0.2 }),
  },
  {
    name: "whitespace and reordered non-learner fields",
    text: '{\n  "nextStep" : "Summary",\n  "concept" : "c",\n  "explanation" : "Spaced out.",\n  "example" : "ok",\n  "confidence" : 0.3\n}',
  },
];

function expectedDisplay(text: string): string {
  const parsed = JSON.parse(text) as TeachingResponse;
  return formatTeachingResponseAsReply(parsed);
}

function streamWith(chunks: string[]) {
  const extractor = createConceptExplanationExtractor();
  let displayed = "";
  for (const chunk of chunks) displayed += extractor.push(chunk);
  return { displayed, result: extractor.finish() };
}

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

for (const { name, text } of CORPUS) {
  test(`every single split point reproduces the formatted reply: ${name}`, () => {
    const expected = expectedDisplay(text);
    for (let split = 0; split <= text.length; split += 1) {
      const { displayed, result } = streamWith([text.slice(0, split), text.slice(split)]);
      assert.equal(result.status, "ok", `split ${split}`);
      assert.equal(result.complete, true, `split ${split}`);
      assert.equal(result.displayHalted, false, `split ${split}`);
      assert.equal(displayed, expected, `split ${split}`);
    }
  });

  test(`randomized multi-chunk splits reproduce the formatted reply: ${name}`, () => {
    const expected = expectedDisplay(text);
    const random = seeded(name.length * 7919);
    for (let trial = 0; trial < 200; trial += 1) {
      const chunks: string[] = [];
      let position = 0;
      while (position < text.length) {
        const size = 1 + Math.floor(random() * 6);
        chunks.push(text.slice(position, position + size));
        position += size;
      }
      const { displayed, result } = streamWith(chunks);
      assert.equal(displayed, expected, `trial ${trial} chunks ${JSON.stringify(chunks)}`);
      assert.equal(result.complete, true);
    }
  });

  test(`one character per delta reproduces the formatted reply: ${name}`, () => {
    const { displayed } = streamWith(text.split(""));
    assert.equal(displayed, expectedDisplay(text));
  });
}

test("decoded learner text never contains JSON syntax or another field's value", () => {
  const text = CORPUS.find((c) => c.name === "other fields contain the key text")!.text;
  const { displayed } = streamWith(text.split(""));
  assert.equal(displayed, expectedDisplay(text));
  assert.equal(displayed.includes('"explanation": "fake"'), false, "concept field must not leak");
  assert.equal(displayed.includes("concept"), false);
  assert.equal(displayed.startsWith("Real one."), true);
});

test("a backslash or a unicode escape split across deltas is held until it resolves", () => {
  const text = '{"concept":"c","explanation":"caf\\u00e9 \\\\ \\"q\\"","example":"","nextStep":"Practice","confidence":0.1}';
  const expected = expectedDisplay(text);
  const cuts = [text.indexOf("\\u") + 1, text.indexOf("\\u") + 3, text.indexOf("\\\\") + 1];
  for (const cut of cuts) {
    const { displayed } = streamWith([text.slice(0, cut), text.slice(cut)]);
    assert.equal(displayed, expected, `cut ${cut}`);
  }
});

test("a surrogate pair split across deltas is emitted once, not as two lone halves", () => {
  const text = '{"concept":"c","explanation":"\\ud83d\\ude00","example":"","nextStep":"Practice","confidence":0.1}';
  const extractor = createConceptExplanationExtractor();
  const emitted: string[] = [];
  const cut = text.indexOf("\\ude00");
  emitted.push(extractor.push(text.slice(0, cut)));
  emitted.push(extractor.push(text.slice(cut)));
  assert.equal(emitted.join(""), "\u{1F600}");
  assert.equal(emitted[0], "");
});

test("malformed JSON marks the stream malformed and halts display", () => {
  const cases = [
    '{"concept":"c" "explanation":"x"}',
    '{"concept":"c","explanation":"unterminated',
    '{"explanation":"x" trailing}',
    '{"explanation":"bad \\q escape"}',
    '{"explanation":"raw\ncontrol"}',
    '{"explanation":{"nested":true}}',
    'not json at all',
  ];
  for (const text of cases) {
    const { result } = streamWith(text.split(""));
    assert.notEqual(result.status, "ok", text);
    assert.equal(result.complete, false, text);
  }
});

test("a duplicate explanation key is reported and halts display", () => {
  const text = '{"explanation":"first","concept":"c","explanation":"second","example":"","nextStep":"Practice","confidence":0.1}';
  const { displayed, result } = streamWith(text.split(""));
  assert.equal(result.status, "duplicate_key");
  assert.equal(result.complete, false);
  assert.equal(displayed, "first");
});

test("example before explanation halts display but still completes the object", () => {
  const text = '{"concept":"c","example":"Use 5 - 2.","explanation":"Late explanation.","nextStep":"Practice","confidence":0.1}';
  const { displayed, result } = streamWith(text.split(""));
  assert.equal(result.status, "ok");
  assert.equal(result.complete, true);
  assert.equal(result.displayHalted, true);
  assert.equal(displayed.includes("Use 5"), false);
});

test("displayed text is reported by delta, so the first visible character can be timed", () => {
  const extractor = createConceptExplanationExtractor();
  assert.equal(extractor.push('{"concept":"c","explanation":"'), "");
  assert.equal(extractor.push("Hi"), "Hi");
});
