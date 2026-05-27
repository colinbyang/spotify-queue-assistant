// Helper for talking to Spotify and handling token refresh.
// Tokens are read from / written to HTTP-only cookies in the API routes.

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";

/**
 * Build the Basic auth header used by Spotify token endpoints.
 */
function basicAuthHeader() {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

/**
 * Exchange an authorization code for access + refresh tokens.
 * Called once, right after the user approves on Spotify.
 */
export async function exchangeCodeForTokens(code) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  return res.json(); // { access_token, refresh_token, expires_in, ... }
}

/**
 * Use the refresh token to get a new access token.
 * Spotify usually keeps the same refresh token, but sometimes returns a new one.
 */
export async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }

  return res.json(); // { access_token, expires_in, refresh_token? }
}

/**
 * Make an authenticated GET request to the Spotify Web API.
 */
export async function spotifyGet(accessToken, path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (res.status === 204) return null; // no content (nothing playing)
  if (!res.ok) return null;
  return res.json();
}

/**
 * Make an authenticated POST request to the Spotify Web API.
 * Returns true if Spotify accepted it.
 */
export async function spotifyPost(accessToken, path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.ok;
}

/**
 * Add a track to the user's playback queue.
 * Spotify only supports appending — there's no insert-at-position API.
 */
export async function addToQueue(accessToken, trackId) {
  const uri = `spotify:track:${trackId}`;
  const res = await fetch(
    `${API_BASE}/me/player/queue?uri=${encodeURIComponent(uri)}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  return res.ok;
}

/**
 * Generate a random string for the OAuth `state` parameter (CSRF protection).
 */
export function generateRandomString(length = 32) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let str = "";
  for (let i = 0; i < length; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return str;
}

export const SPOTIFY_SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
].join(" ");
