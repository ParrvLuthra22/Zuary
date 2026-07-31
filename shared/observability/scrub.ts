/**
 * PII scrubbing for anything on its way to Sentry.
 *
 * Deliberately in /shared and framework-free: the same function runs in the
 * browser config, the server config and the edge config, and three copies of a
 * redaction rule is how one of them ends up out of date.
 *
 * The approach is deny-by-key plus deny-by-pattern, applied to the whole event
 * recursively. Scrubbing only the obvious fields is not enough — a customer's
 * email turns up in a breadcrumb URL, a form serialisation, an error message,
 * a request body and a span description, and any single one of those is a
 * disclosure.
 */

/** Key names whose values never leave the building, whatever they contain. */
const DENY_KEYS = new Set([
  "email",
  "phone",
  "name",
  "fullname",
  "full_name",
  "line1",
  "line2",
  "address",
  "addressjson",
  "address_json",
  "city",
  "pincode",
  "postcode",
  "zip",
  "password",
  "token",
  "ticket",
  "secret",
  "authorization",
  "cookie",
  "set-cookie",
  "codehash",
  "code_hash",
  "otp",
  "signature",
  "razorpay_signature",
]);

const REDACTED = "[redacted]";

/**
 * Patterns for values that leak regardless of what key they arrive under.
 *
 * The Razorpay key patterns are the important ones. `rzp_live_*` is a
 * publishable id and `key_secret` is not, but a secret in a log is a secret in
 * a log — and Razorpay error strings quote both. Order matters: the longest,
 * most specific patterns run first so a partial match cannot leave a fragment.
 */
const VALUE_PATTERNS: [RegExp, string][] = [
  // Razorpay ids and keys, in every shape they appear.
  [/\brzp_(live|test)_[A-Za-z0-9]+/g, "rzp_[redacted]"],
  [/\b(key_secret|key_id)["'\s:=]+[A-Za-z0-9_-]+/gi, "$1=[redacted]"],
  // Email addresses.
  [/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[email]"],
  /*
   * Indian mobile numbers, with or without the country code.
   *
   * Lookarounds rather than \b on the digits: \b never matches between two
   * digits, so a leading "+91" glued straight onto the number defeated the
   * boundary and the whole thing went through unredacted. Caught by the test
   * for exactly that case.
   */
  [/(?<!\d)(?:\+?91[-\s]?)?[6-9]\d{9}(?!\d)/g, "[phone]"],
  // Six-digit PIN codes that are clearly labelled as such.
  [/\b(pin|pincode|postal)\W{0,3}\b\d{6}\b/gi, "$1 [redacted]"],
  // Bearer tokens and long opaque credentials.
  [/\bBearer\s+[A-Za-z0-9._-]{12,}/gi, "Bearer [redacted]"],
];

function scrubString(value: string): string {
  let out = value;
  for (const [pattern, replacement] of VALUE_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/**
 * Walks an arbitrary structure, redacting as it goes.
 *
 * Depth-capped and cycle-safe: a Sentry event carries request objects and
 * contexts that can be self-referential, and a scrubber that hangs or blows the
 * stack takes the whole error report with it.
 */
export function scrub<T>(input: T, depth = 0, seen = new WeakSet<object>()): T {
  if (depth > 12) return REDACTED as unknown as T;
  if (input == null) return input;

  if (typeof input === "string") return scrubString(input) as unknown as T;
  if (typeof input !== "object") return input;

  if (seen.has(input as object)) return REDACTED as unknown as T;
  seen.add(input as object);

  if (Array.isArray(input)) {
    return input.map((item) => scrub(item, depth + 1, seen)) as unknown as T;
  }

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (DENY_KEYS.has(key.toLowerCase())) {
      out[key] = REDACTED;
      continue;
    }
    out[key] = scrub(value, depth + 1, seen);
  }
  return out as T;
}

/**
 * Strips the query string from a URL but keeps the path.
 *
 * The path is what makes an event useful — `/api/checkout/verify` tells you
 * where it broke. The query is where an email or a token ends up when someone
 * adds a parameter in six months.
 */
export function scrubUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const parsed = new URL(url, "http://internal");
    return `${parsed.origin === "http://internal" ? "" : parsed.origin}${parsed.pathname}`;
  } catch {
    return scrubString(url);
  }
}

/** Routes where any error is worth paging someone: these ones cost money. */
export const MONEY_ROUTES = [/^\/api\/checkout\//, /^\/api\/webhooks\//];

export function isMoneyRoute(path: string | undefined): boolean {
  if (!path) return false;
  return MONEY_ROUTES.some((pattern) => pattern.test(path));
}
