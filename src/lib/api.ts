/**
 * One way to call this app's own API, so a failure can say what went wrong.
 *
 * Every screen used to collapse any non-OK response into "An error occurred.",
 * which made an expired session indistinguishable from a server fault: the
 * installed app opens straight at /dashboard, so a stale cookie read as "the
 * whole app is broken" on every tab. An ApiError carries the status, and the
 * one failure a user can actually act on — 401, sign in again — is named.
 */

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }

  /** The session is gone, or was never there. Signing in fixes it. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

/** True for the one failure signing in fixes, whatever the thrown value is. */
export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.isUnauthorized;
}

/** Whatever the route offered as a reason, else something honest about the status. */
async function reasonFor(res: Response): Promise<string> {
  // The routes answer 401 with wording aimed at developers ("Invalid user
  // authentication"), so say the useful thing instead of passing it through.
  if (res.status === 401) return "Your session has expired. Sign in again.";

  try {
    const body = await res.json();
    const reason = body?.message ?? body?.error;
    if (typeof reason === "string" && reason.trim()) return reason;
  } catch {
    /* not JSON — the status is all we have */
  }

  if (res.status === 404) return "That isn't there any more.";
  if (res.status >= 500) return `The server failed (${res.status}). Try again.`;
  return `That request failed (${res.status}).`;
}

/**
 * Fetch JSON, throwing an ApiError that carries the status.
 *
 * `credentials: "include"` so the session cookie rides along even when the app
 * is running installed from the home screen.
 */
export async function fetchJson<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { credentials: "include", ...init });
  } catch {
    // No status to read at all: offline, DNS, or a connection dropped
    // mid-set — which on a gym floor is the common case.
    throw new ApiError(0, "Can't reach the server. Check your connection.");
  }

  if (!res.ok) throw new ApiError(res.status, await reasonFor(res));
  return (await res.json()) as T;
}

/** The line to put in front of the user for any thrown value. */
export function errorMessage(
  error: unknown,
  fallback = "Something went wrong."
): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
