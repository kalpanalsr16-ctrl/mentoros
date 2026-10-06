/**
 * Incremental extractor for the learner-facing fields of a streamed
 * TeachingResponse. The SDK delivers raw JSON text; this reads it one code
 * unit at a time, keeps its state across chunk boundaries, and emits only the
 * decoded text of `explanation` and `example`, in the same shape as
 * formatTeachingResponseAsReply(). It never emits JSON syntax or any other field.
 *
 * It is presentation state only. The final validated object is canonical, and
 * callers must reconcile it with what was displayed before using the stream.
 */

export const EXAMPLE_SEPARATOR = "\n\nFor example: ";

type Status = "ok" | "malformed" | "duplicate_key";

type StringDecoderState = "plain" | "backslash" | "unicode";

const SIMPLE_ESCAPES: Record<string, string> = {
  '"': '"',
  "\\": "\\",
  "/": "/",
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
};

function isHexDigit(unit: string): boolean {
  const code = unit.charCodeAt(0);
  return (code >= 0x30 && code <= 0x39) || (code >= 0x41 && code <= 0x46) || (code >= 0x61 && code <= 0x66);
}

/** Decodes one JSON string literal, one code unit at a time. Holds a high surrogate until its pair arrives. */
class JsonStringDecoder {
  private state: StringDecoderState = "plain";
  private unicodeDigits = "";
  private pendingHigh: string | null = null;

  /** Returns decoded text for this unit, `end` when the closing quote is reached, or `error` for invalid JSON. */
  feed(unit: string): { out: string; end: boolean; error: boolean } {
    if (this.state === "backslash") {
      this.state = "plain";
      if (unit === "u") {
        this.state = "unicode";
        this.unicodeDigits = "";
        return { out: "", end: false, error: false };
      }
      const mapped = SIMPLE_ESCAPES[unit];
      if (mapped === undefined) return { out: "", end: false, error: true };
      return { out: this.emitUnit(mapped), end: false, error: false };
    }

    if (this.state === "unicode") {
      if (!isHexDigit(unit)) return { out: "", end: false, error: true };
      this.unicodeDigits += unit;
      if (this.unicodeDigits.length < 4) return { out: "", end: false, error: false };
      this.state = "plain";
      return { out: this.emitUnit(String.fromCharCode(Number.parseInt(this.unicodeDigits, 16))), end: false, error: false };
    }

    if (unit === "\\") {
      this.state = "backslash";
      return { out: "", end: false, error: false };
    }
    if (unit === '"') {
      return { out: this.flush(), end: true, error: false };
    }
    if (unit < " ") return { out: "", end: false, error: true };
    return { out: this.emitUnit(unit), end: false, error: false };
  }

  private emitUnit(unit: string): string {
    const code = unit.charCodeAt(0);
    const isHigh = code >= 0xd800 && code <= 0xdbff;
    const isLow = code >= 0xdc00 && code <= 0xdfff;
    if (this.pendingHigh !== null) {
      if (isLow) {
        const pair = this.pendingHigh + unit;
        this.pendingHigh = null;
        return pair;
      }
      const lone = this.pendingHigh;
      this.pendingHigh = null;
      return lone + this.emitUnit(unit);
    }
    if (isHigh) {
      this.pendingHigh = unit;
      return "";
    }
    return unit;
  }

  private flush(): string {
    const lone = this.pendingHigh ?? "";
    this.pendingHigh = null;
    return lone;
  }
}

type FieldTarget = "explanation" | "example" | "other" | null;

type ExtractorState =
  | "BEFORE_OBJECT"
  | "KEY_START"
  | "KEY"
  | "AFTER_KEY"
  | "VALUE_START"
  | "STRING_VALUE"
  | "SCALAR_VALUE"
  | "AFTER_VALUE"
  | "END";

export type ConceptExplanationExtraction = {
  status: Status;
  complete: boolean;
  displayText: string;
  displayHalted: boolean;
  displayedChars: number;
};

export function createConceptExplanationExtractor() {
  let state: ExtractorState = "BEFORE_OBJECT";
  let status: Status = "ok";
  let keyDecoder = new JsonStringDecoder();
  let valueDecoder = new JsonStringDecoder();
  let keyName = "";
  let currentKey: string | null = null;
  let target: FieldTarget = null;
  const seenKeys = new Set<string>();
  let explanationDone = false;
  let separatorEmitted = false;
  let displayHalted = false;
  let displayText = "";
  let complete = false;

  const emit = (text: string) => {
    if (text.length > 0 && !displayHalted) displayText += text;
  };

  const fail = (kind: Status) => {
    status = kind;
    state = "END";
    displayHalted = true;
  };

  const step = (unit: string) => {
    if (status !== "ok") return;
    const isWhitespace = unit === " " || unit === "\n" || unit === "\r" || unit === "\t";

    switch (state) {
      case "BEFORE_OBJECT":
        if (isWhitespace) return;
        if (unit === "{") {
          state = "KEY_START";
          return;
        }
        return fail("malformed");

      case "KEY_START":
        if (isWhitespace) return;
        if (unit === '"') {
          keyDecoder = new JsonStringDecoder();
          keyName = "";
          state = "KEY";
          return;
        }
        if (unit === "}") {
          state = "END";
          complete = true;
          return;
        }
        return fail("malformed");

      case "KEY": {
        const result = keyDecoder.feed(unit);
        if (result.error) return fail("malformed");
        keyName += result.out;
        if (!result.end) return;
        if (seenKeys.has(keyName)) return fail("duplicate_key");
        seenKeys.add(keyName);
        currentKey = keyName;
        state = "AFTER_KEY";
        return;
      }

      case "AFTER_KEY":
        if (isWhitespace) return;
        if (unit === ":") {
          state = "VALUE_START";
          return;
        }
        return fail("malformed");

      case "VALUE_START": {
        if (isWhitespace) return;
        const isLearnerField = currentKey === "explanation" || currentKey === "example";
        if (unit === '"') {
          valueDecoder = new JsonStringDecoder();
          target = currentKey === "explanation" ? "explanation" : currentKey === "example" ? "example" : "other";
          if (target === "example" && !explanationDone) displayHalted = true;
          state = "STRING_VALUE";
          return;
        }
        if (isLearnerField) return fail("malformed");
        if (unit === "{" || unit === "[") return fail("malformed");
        state = "SCALAR_VALUE";
        if (unit === ",") {
          state = "KEY_START";
        } else if (unit === "}") {
          state = "END";
          complete = true;
        }
        return;
      }

      case "STRING_VALUE": {
        const result = valueDecoder.feed(unit);
        if (result.error) return fail("malformed");
        if (target === "explanation") {
          emit(result.out);
        } else if (target === "example" && result.out.length > 0 && !displayHalted) {
          if (!separatorEmitted) {
            emit(EXAMPLE_SEPARATOR);
            separatorEmitted = true;
          }
          emit(result.out);
        }
        if (!result.end) return;
        if (target === "explanation") explanationDone = true;
        target = null;
        state = "AFTER_VALUE";
        return;
      }

      case "SCALAR_VALUE":
        if (unit === ",") {
          state = "KEY_START";
        } else if (unit === "}") {
          state = "END";
          complete = true;
        }
        return;

      case "AFTER_VALUE":
        if (isWhitespace) return;
        if (unit === ",") {
          state = "KEY_START";
          return;
        }
        if (unit === "}") {
          state = "END";
          complete = true;
          return;
        }
        return fail("malformed");

      case "END":
        if (isWhitespace) return;
        return fail("malformed");
    }
  };

  return {
    /** Feeds one SDK text delta. Returns the newly displayable text for this delta. */
    push(delta: string): string {
      const before = displayText.length;
      for (let index = 0; index < delta.length; index += 1) {
        step(delta[index]);
      }
      return displayText.slice(before);
    },
    finish(): ConceptExplanationExtraction {
      if (state !== "END" || !complete) {
        if (status === "ok") status = "malformed";
      }
      return {
        status,
        complete: complete && status === "ok",
        displayText,
        displayHalted,
        displayedChars: displayText.length,
      };
    },
  };
}
