/**
 * Public Endpoint Rate Limiter & Anti-Scraping Shield.
 * Sliding window rate limiter preventing Passport enumeration and anti-abuse protection.
 */

export interface RateLimitState {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitState>();

export interface RateLimitConfig {
  maxRequests?: number; // Default 10 requests
  windowMs?: number;    // Default 60,000 ms (1 minute)
}

export function checkRateLimit(
  identifier: string, // IP or Client Key
  config: RateLimitConfig = {}
): { allowed: boolean; remaining: number; resetInMs: number } {
  const maxRequests = config.maxRequests ?? 10;
  const windowMs = config.windowMs ?? 60000;
  const now = Date.now();

  const state = rateLimitStore.get(identifier);

  if (!state || now >= state.resetAt) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, remaining: maxRequests - 1, resetInMs: windowMs };
  }

  if (state.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetInMs: Math.max(0, state.resetAt - now),
    };
  }

  state.count++;
  rateLimitStore.set(identifier, state);

  return {
    allowed: true,
    remaining: maxRequests - state.count,
    resetInMs: Math.max(0, state.resetAt - now),
  };
}

export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}
