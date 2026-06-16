/**
 * Auth Utilities — Token management
 *
 * Handles: JWT storage, decode, expiry check
 */

/**
 * Store auth token in sessionStorage.
 */
export function setToken(token) {
  sessionStorage.setItem('token', token);
}

/**
 * Get stored token.
 */
export function getToken() {
  return sessionStorage.getItem('token');
}

/**
 * Remove stored token (logout).
 */
export function removeToken() {
  sessionStorage.removeItem('token');
}

/**
 * Decode JWT payload without verification.
 * For client-side display only — server always verifies.
 */
export function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

/**
 * Check if token is expired.
 */
export function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  return Date.now() >= decoded.exp * 1000;
}

/**
 * Get the role from the stored token.
 */
export function getRole() {
  const token = getToken();
  if (!token) return null;
  const decoded = decodeToken(token);
  return decoded?.role || null;
}
