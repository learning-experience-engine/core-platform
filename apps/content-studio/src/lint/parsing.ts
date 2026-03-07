import type { LintApiResponse, LintResult } from "./types";

export const parseLintResult = (payload: LintApiResponse): LintResult | null => {
  if (payload.format !== "json" || !payload.stdout) {
    return null;
  }
  try {
    const parsed = JSON.parse(payload.stdout) as LintResult;
    if (!Array.isArray(parsed.errors) || !Array.isArray(parsed.warnings)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};
