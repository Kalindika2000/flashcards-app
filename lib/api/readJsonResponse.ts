/**
 * Parse a fetch Response body as JSON once, then branch on ok / error message.
 */
export async function parseJsonResponse<T>(
  response: Response,
): Promise<
  | { ok: true; data: T }
  | { ok: false; status: number; message: string }
> {
  const text = await response.text();

  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    return {
      ok: false,
      status: response.status,
      message: response.ok
        ? "Invalid response from server"
        : "Request failed",
    };
  }

  const obj = parsed as { error?: unknown };

  if (!response.ok) {
    const message =
      typeof obj.error === "string" && obj.error.trim()
        ? obj.error.trim()
        : `Request failed (${response.status})`;
    return { ok: false, status: response.status, message };
  }

  return { ok: true, data: parsed as T };
}
