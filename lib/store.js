// In-memory store for blocked tracks and session state.
// Attached to globalThis so the state survives Next.js dev hot-reloads.
// In a real app you'd use a database; for the MVP this lives in process memory.

const STATE_KEY = Symbol.for("__spotify_queue_assistant_state__");

function getState() {
  if (!globalThis[STATE_KEY]) {
    globalThis[STATE_KEY] = {};
  }
  const s = globalThis[STATE_KEY];
  // Migrate / initialize any missing fields. This makes the function
  // robust to dev-mode hot-reloads where the state was created by an
  // older version of this file that didn't have all the fields.
  if (!Array.isArray(s.blockedTracks)) s.blockedTracks = [];
  if (!Array.isArray(s.tethers)) s.tethers = [];
  if (typeof s.sessionActive !== "boolean") s.sessionActive = false;
  if (!(s.oauthStates instanceof Map)) s.oauthStates = new Map();
  return s;
}

// ─── OAuth state tracking ───────────────────────────────────────────

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function recordOAuthState(state) {
  const s = getState();
  // Garbage-collect expired states on each issuance
  const now = Date.now();
  for (const [k, exp] of s.oauthStates) {
    if (exp < now) s.oauthStates.delete(k);
  }
  s.oauthStates.set(state, now + STATE_TTL_MS);
}

export function consumeOAuthState(state) {
  const s = getState();
  const exp = s.oauthStates.get(state);
  if (!exp) return false;
  s.oauthStates.delete(state);
  return exp >= Date.now();
}

export function getBlocked() {
  return getState().blockedTracks;
}

export function addBlocked(track) {
  const s = getState();
  if (s.blockedTracks.some((t) => t.id === track.id)) return s.blockedTracks;
  s.blockedTracks = [...s.blockedTracks, track];
  return s.blockedTracks;
}

export function removeBlocked(id) {
  const s = getState();
  s.blockedTracks = s.blockedTracks.filter((t) => t.id !== id);
  return s.blockedTracks;
}

export function clearBlocked() {
  const s = getState();
  s.blockedTracks = [];
  return s.blockedTracks;
}

export function isBlocked(id) {
  return getState().blockedTracks.some((t) => t.id === id);
}

export function getSessionActive() {
  return getState().sessionActive;
}

export function setSessionActive(value) {
  getState().sessionActive = value;
}

// ─── Tethers ────────────────────────────────────────────────────────

export function getTethers() {
  return getState().tethers;
}

export function addTether(tether) {
  const s = getState();
  // Replace any existing tether for the same trigger.
  s.tethers = [
    ...s.tethers.filter((t) => t.triggerId !== tether.triggerId),
    tether,
  ];
  return s.tethers;
}

export function removeTether(triggerId) {
  const s = getState();
  s.tethers = s.tethers.filter((t) => t.triggerId !== triggerId);
  return s.tethers;
}

export function clearTethers() {
  const s = getState();
  s.tethers = [];
  return s.tethers;
}

export function getTetherForTrigger(triggerId) {
  return getState().tethers.find((t) => t.triggerId === triggerId) ?? null;
}
