import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  MAX_NOTES_LENGTH,
  parseNotesBody,
  requireOpenAiKey,
} from "./parseNotesBody";

describe("parseNotesBody", () => {
  it("rejects non-object body", async () => {
    const r = parseNotesBody(null);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected error");
    expect(r.response.status).toBe(400);
    const body = await r.response.json();
    expect(body.error).toBe("Invalid JSON body");
  });

  it("rejects missing or non-string notes", async () => {
    const r1 = parseNotesBody({});
    expect(r1.ok).toBe(false);
    if (r1.ok) throw new Error("expected error");
    expect(r1.response.status).toBe(400);

    const r2 = parseNotesBody({ notes: 1 });
    expect(r2.ok).toBe(false);
    if (r2.ok) throw new Error("expected error");
    expect(r2.response.status).toBe(400);
  });

  it("rejects empty notes after trim", async () => {
    const r = parseNotesBody({ notes: "   \n\t  " });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected error");
    expect(r.response.status).toBe(400);
    const body = await r.response.json();
    expect(body.error).toBe("notes cannot be empty");
  });

  it("rejects notes over max length", async () => {
    const r = parseNotesBody({ notes: "a".repeat(MAX_NOTES_LENGTH + 1) });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected error");
    expect(r.response.status).toBe(413);
  });

  it("returns trimmed notes on success", () => {
    const r = parseNotesBody({ notes: "  hello  " });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.notes).toBe("hello");
  });
});

describe("requireOpenAiKey", () => {
  const orig = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    if (orig === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = orig;
    }
  });

  it("returns 503 when key is missing", async () => {
    const res = requireOpenAiKey();
    expect(res).not.toBeNull();
    expect(res!.status).toBe(503);
    const body = await res!.json();
    expect(body.error).toBe("Server is not configured for AI generation");
  });

  it("returns null when key is set", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    expect(requireOpenAiKey()).toBeNull();
  });

  it("treats whitespace-only key as missing", async () => {
    process.env.OPENAI_API_KEY = "   ";
    const res = requireOpenAiKey();
    expect(res).not.toBeNull();
    expect(res!.status).toBe(503);
  });
});
