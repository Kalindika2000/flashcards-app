import { describe, it, expect } from "vitest";
import { parseJsonResponse } from "./readJsonResponse";

describe("parseJsonResponse", () => {
  it("returns data when response is ok", async () => {
    const res = new Response(JSON.stringify({ a: 1 }), { status: 200 });
    const out = await parseJsonResponse<{ a: number }>(res);
    expect(out.ok).toBe(true);
    if (!out.ok) throw new Error("expected ok");
    expect(out.data.a).toBe(1);
  });

  it("parses empty body as empty object when ok", async () => {
    const res = new Response("", { status: 200 });
    const out = await parseJsonResponse<Record<string, never>>(res);
    expect(out.ok).toBe(true);
    if (!out.ok) throw new Error("expected ok");
    expect(out.data).toEqual({});
  });

  it("uses error field when response is not ok", async () => {
    const res = new Response(JSON.stringify({ error: "bad" }), {
      status: 400,
    });
    const out = await parseJsonResponse(res);
    expect(out.ok).toBe(false);
    if (out.ok) throw new Error("expected error");
    expect(out.status).toBe(400);
    expect(out.message).toBe("bad");
  });

  it("falls back when not ok and error is missing", async () => {
    const res = new Response(JSON.stringify({}), { status: 502 });
    const out = await parseJsonResponse(res);
    expect(out.ok).toBe(false);
    if (out.ok) throw new Error("expected error");
    expect(out.message).toBe("Request failed (502)");
  });

  it("returns parse failure message when JSON is invalid", async () => {
    const res = new Response("not json", { status: 200 });
    const out = await parseJsonResponse(res);
    expect(out.ok).toBe(false);
    if (out.ok) throw new Error("expected error");
    expect(out.message).toBe("Invalid response from server");
  });

  it("uses Request failed when JSON invalid and not ok", async () => {
    const res = new Response("not json", { status: 500 });
    const out = await parseJsonResponse(res);
    expect(out.ok).toBe(false);
    if (out.ok) throw new Error("expected error");
    expect(out.message).toBe("Request failed");
  });
});
