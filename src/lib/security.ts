/**
 * Aether Security & Bot Shield Utilities
 * Provides disposable email filtering, bot velocity detection,
 * honeypot validation, and password entropy evaluation for Sanctuary access.
 */

// Popular disposable / temporary / burner email domains commonly used by spam bots
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "10minutemail.com",
  "10minutemail.net",
  "burnermail.io",
  "crazymailing.com",
  "dispostable.com",
  "dropmail.me",
  "emailondeck.com",
  "fakeinbox.com",
  "fakemailgenerator.com",
  "generator.email",
  "getnada.com",
  "grr.la",
  "guerrillamail.biz",
  "guerrillamail.com",
  "guerrillamail.de",
  "guerrillamail.info",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "mailinator.com",
  "mohmal.com",
  "mytrashmail.com",
  "sharklasers.com",
  "temp-mail.org",
  "tempail.com",
  "tempmail.com",
  "throwawaymail.com",
  "trashmail.com",
  "trashmail.me",
  "trashmail.net",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
]);

/**
 * Checks whether an email belongs to a known temporary or burner domain.
 */
export function isDisposableEmail(email: string): boolean {
  if (!email || !email.includes("@")) return false;
  const domain = email.split("@")[1]?.trim().toLowerCase();
  if (!domain) return false;
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

/**
 * Validates submission velocity against bot automated scripting.
 * Humans require at least ~800ms to visually parse and submit a form.
 */
export function isBotVelocity(mountedAt: number, thresholdMs = 800): boolean {
  if (!mountedAt) return false;
  const elapsed = Date.now() - mountedAt;
  return elapsed < thresholdMs;
}

/**
 * Validates invisible honeypot trap field.
 * Legitimate humans cannot see or populate this field.
 */
export function isHoneypotTriggered(trapValue: string): boolean {
  return typeof trapValue === "string" && trapValue.trim().length > 0;
}

export interface PasswordStrength {
  score: number; // 0 to 4
  label: "Too Short" | "Weak" | "Fair" | "Good" | "Sanctuary-Grade";
  hasMinLength: boolean;
  hasLength8: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

/**
 * Calculates password complexity and entropy for luxury audiophile security.
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: "Too Short",
      hasMinLength: false,
      hasLength8: false,
      hasUpper: false,
      hasLower: false,
      hasNumber: false,
      hasSpecial: false,
    };
  }

  const hasMinLength = password.length >= 6;
  const hasLength8 = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  let points = 0;
  if (hasMinLength) points += 1;
  if (hasLength8) points += 1;
  if (hasUpper && hasLower) points += 1;
  if (hasNumber) points += 0.5;
  if (hasSpecial) points += 0.5;

  let score = 0;
  let label: PasswordStrength["label"] = "Too Short";

  if (!hasMinLength) {
    score = 0;
    label = "Too Short";
  } else if (points < 2.5) {
    score = 1;
    label = "Weak";
  } else if (points < 3.5) {
    score = 2;
    label = "Fair";
  } else if (points < 4) {
    score = 3;
    label = "Good";
  } else {
    score = 4;
    label = "Sanctuary-Grade";
  }

  return {
    score,
    label,
    hasMinLength,
    hasLength8,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
  };
}
