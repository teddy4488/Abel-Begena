type MaybeErrorData = {
  message?: unknown;
};

/** Soften the raw NestJS class-validator constraint phrasing into something an end
 * user can act on. Pure rewrites — leaves anything we don't recognize unchanged. */
function softenConstraint(s: string): string {
  return s
    .replace(/^each value in (\S+) must be one of the following values:?\s*/i, "$1 has an invalid value: ")
    .replace(/^each value in (\S+) must be /i, "$1 has an invalid item: must be ")
    .replace(/property\s+(\S+)\s+should not exist/i, "field '$1' is not allowed")
    .replace(/must be a mongodb id/i, "is missing or invalid")
    .replace(/must be a valid enum value/i, "has an invalid value")
    .replace(/must be one of the following values:/i, "must be one of:")
    .trim();
}

/** Turn a NestJS error message (string or string[]) into a user-readable string. */
function formatMessage(raw: unknown): string | null {
  if (typeof raw === "string") {
    const m = softenConstraint(raw);
    return m.length > 0 ? m : null;
  }
  if (Array.isArray(raw)) {
    const cleaned = raw
      .map((m) => (typeof m === "string" ? softenConstraint(m) : ""))
      .map((m) => m.trim())
      .filter((m) => m.length > 0);
    if (cleaned.length === 0) return null;
    if (cleaned.length === 1) return cleaned[0];
    return cleaned.map((m) => `• ${m}`).join("\n");
  }
  return null;
}

export function extractErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (!error) {
    return fallback;
  }

  if (error instanceof Error && error.message) {
    const m = formatMessage(error.message);
    if (m) return m;
  }

  // RTK Query: { data: { message: string | string[] } }
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof (error as { data?: MaybeErrorData }).data === "object"
  ) {
    const maybeData = (error as { data?: MaybeErrorData }).data;
    const m = formatMessage(maybeData?.message);
    if (m) return m;
  }

  // RTK Query nested error: { error: { data: { message: ... } } }
  if (
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    typeof (error as { error?: { data?: MaybeErrorData } }).error === "object"
  ) {
    const nested = (error as { error?: { data?: MaybeErrorData } }).error;
    const m = formatMessage(nested?.data?.message);
    if (m) return m;
  }

  // Bare error object with a message field
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    const m = formatMessage((error as { message: unknown }).message);
    if (m) return m;
  }

  return fallback;
}
