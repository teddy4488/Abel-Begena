type MaybeErrorData = {
  message?: unknown;
};

export function extractErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (!error) {
    return fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof (error as { data?: MaybeErrorData }).data === "object"
  ) {
    const maybeData = (error as { data?: MaybeErrorData }).data;
    if (maybeData?.message && typeof maybeData.message === "string") {
      return maybeData.message;
    }
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    typeof (error as { error?: { data?: MaybeErrorData } }).error === "object"
  ) {
    const nested = (error as { error?: { data?: MaybeErrorData } }).error;
    if (
      nested?.data?.message &&
      typeof nested.data.message === "string"
    ) {
      return nested.data.message;
    }
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
}


