import { validateDefinitionDistractors } from "@/features/study/utils/validateDefinitionDistractors";

function uniqueNonEmpty(strings: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of strings) {
    const t = s.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/**
 * Rule-based plausible wrong answers when AI fails. Tries transform combinations
 * until a triple passes validateDefinitionDistractors.
 */
export function buildFallbackDefinitionDistractors(correctAnswer: string): string[] | null {
  const c = correctAnswer.trim();
  if (!c) return null;

  const cLower = c.toLowerCase();
  const candidates: string[] = [];

  const add = (s: string) => {
    const t = s.trim();
    if (t.split(/\s+/).filter(Boolean).length < 4) return;
    if (t.toLowerCase() === cLower) return;
    candidates.push(t);
  };

  add(c.replace(/\bmust\b/gi, "may"));
  add(c.replace(/\bmust\b/gi, "need not"));
  add(c.replace(/\bmust\b/gi, "might not"));
  add(c.replace(/\bshould\b/gi, "need not"));
  add(c.replace(/\bare required to\b/gi, "are not required to"));
  add(c.replace(/\bis required\b/gi, "is not required"));
  add(c.replace(/\bfor most\b/gi, "for no"));
  add(c.replace(/\bmost\b/gi, "no"));
  add(c.replace(/\ball\b/gi, "no"));
  add(
    c.replace(/\bemployers\b/gi, (m) => (m[0] === "E" ? "Employees" : "employees")),
  );
  add(
    c.replace(/\bemployees\b/gi, (m) => (m[0] === "E" ? "Employers" : "employers")),
  );
  add(c.replace(/\bpay\b/gi, "receive"));
  add(c.replace(/\bpay\b/gi, "fund"));
  add(c.replace(/\bare optional\b/gi, "are mandatory"));
  add(c.replace(/\bmandatory\b/gi, "optional"));

  const pool = uniqueNonEmpty(candidates);
  const n = pool.length;
  if (n < 3) return null;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        const triple = [pool[i]!, pool[j]!, pool[k]!];
        if (validateDefinitionDistractors(triple, c)) {
          return triple;
        }
      }
    }
  }

  if (pool.length >= 3) {
    return [pool[0]!, pool[1]!, pool[2]!];
  }

  return null;
}
