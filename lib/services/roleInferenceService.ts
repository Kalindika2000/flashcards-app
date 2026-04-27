import { parseJsonResponse } from "@/lib/api/readJsonResponse";

type InferRoleApiResponse = {
  role?: unknown;
};

export async function inferRole(noteContent: string): Promise<string> {
  const response = await fetch("/api/infer-role", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ noteContent }),
  });

  const result = await parseJsonResponse<InferRoleApiResponse>(response);
  if (!result.ok) {
    throw new Error(result.message);
  }

  const raw = result.data.role;
  return typeof raw === "string" && raw.trim() ? raw.trim() : "Professional";
}
