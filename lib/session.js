// Server-side session monitor.
// Uses adaptive polling: instead of a fixed interval, we look at how much
// time is left in the current track and schedule the next poll just before
// the track is expected to end. A short fallback interval catches manual
// interactions (skip, scrub, play different track) almost as fast.
//
// All mutable state lives on globalThis so it survives Next.js dev hot-reloads.

import { isBlocked, getSessionActive, setSessionActive, getTetherForTrigger } from "./store.js";
import { refreshAccessToken, spotifyGet, spotifyPost, addToQueue } from "./spotify.js";

const FAST_POLL_MS = 1500;
const MAX_POLL_MS = 10_000;
const PRE_END_BUFFER_MS = 800;
const SKIP_TIMEOUT_MS = FAST_POLL_MS * 3;
// Cap how many times we'll skip in a single batch to avoid pathological loops.
const MAX_BATCH_SKIPS = 20;

const SESSION_KEY = Symbol.for("__spotify_queue_assistant_session__");

function S() {
  if (!globalThis[SESSION_KEY]) {
    globalThis[SESSION_KEY] = {
      cachedAccessToken: null,
      cachedExpiresAt: 0,
      cachedRefreshToken: null,
      // Map of trackId -> timestamp for tracks we've recently issued skips
      // for. Used to ignore in-flight tracks while Spotify catches up.
      recentlySkipped: new Map(),
      // The last track ID we observed playing. Used to detect transitions
      // so we can fire tether queue-adds exactly once per playback.
      lastSeenTrackId: null,
      pollTimer: null,
    };
  }
  return globalThis[SESSION_KEY];
}

async function getToken() {
  const s = S();
  if (s.cachedAccessToken && Date.now() < s.cachedExpiresAt - 60_000) {
    return s.cachedAccessToken;
  }
  if (!s.cachedRefreshToken) return null;

  try {
    const data = await refreshAccessToken(s.cachedRefreshToken);
    s.cachedAccessToken = data.access_token;
    s.cachedExpiresAt = Date.now() + data.expires_in * 1000;
    if (data.refresh_token) s.cachedRefreshToken = data.refresh_token;
    return s.cachedAccessToken;
  } catch (err) {
    console.error("[session] refresh failed:", err.message);
    return null;
  }
}

async function tick() {
  const s = S();
  s.pollTimer = null;
  if (!getSessionActive()) return;

  const token = await getToken();
  if (!token) {
    console.log("[session] tick: no token");
    scheduleNext(FAST_POLL_MS);
    return;
  }

  const data = await spotifyGet(token, "/me/player/currently-playing");

  if (!data || !data.item) {
    console.log("[session] tick: nothing playing");
    scheduleNext(FAST_POLL_MS);
    return;
  }

  const id = data.item.id;
  const blocked = isBlocked(id);

  // Expire stale skip-tracking entries.
  for (const [trackId, ts] of s.recentlySkipped) {
    if (Date.now() - ts > SKIP_TIMEOUT_MS) s.recentlySkipped.delete(trackId);
  }

  // If this track was part of a recent batch skip, Spotify hasn't fully
  // advanced yet. Wait quietly instead of firing more skips.
  if (s.recentlySkipped.has(id)) {
    console.log(`[session] tick: "${data.item.name}" still in flight, waiting`);
    scheduleNext(FAST_POLL_MS);
    return;
  }

  console.log(
    `[session] tick: "${data.item.name}" id=${id} blocked=${blocked}`
  );

  const remaining =
    typeof data.item.duration_ms === "number"
      ? data.item.duration_ms - (data.progress_ms ?? 0)
      : MAX_POLL_MS;

  if (blocked) {
    // Look ahead in the upcoming queue and gather all consecutive blocked
    // tracks so we can skip past them in one batch.
    const batch = [{ id, name: data.item.name }];
    const seen = new Set([id]);
    const queueData = await spotifyGet(token, "/me/player/queue");
    if (queueData?.queue) {
      for (const t of queueData.queue) {
        if (batch.length >= MAX_BATCH_SKIPS) break;
        // Stop if the queue loops back to a track we've already seen
        // (e.g. album on repeat). Without this we'd skip past the next
        // allowed track when it appears further down the queue.
        if (seen.has(t.id)) break;
        if (!isBlocked(t.id)) break; // first allowed track ends the run
        batch.push({ id: t.id, name: t.name });
        seen.add(t.id);
      }
    }

    console.log(
      `[session] >>> skipping ${batch.length} blocked track(s): ` +
        batch.map((t) => `"${t.name}"`).join(" -> ")
    );

    // Mark them all as "in flight" before firing skips, so subsequent ticks
    // wait quietly even if they briefly observe a transitional track.
    const now = Date.now();
    for (const t of batch) s.recentlySkipped.set(t.id, now);

    for (let i = 0; i < batch.length; i++) {
      const ok = await spotifyPost(token, "/me/player/next");
      if (!ok) {
        console.warn(
          "[session] skip request failed (no active device or not Premium?)"
        );
        break;
      }
    }

    // Bigger batches need a bit more time to settle. Give Spotify ~250ms
    // per skip plus a base wait, capped at MAX_POLL_MS.
    const settleMs = Math.min(FAST_POLL_MS + batch.length * 250, MAX_POLL_MS);
    scheduleNext(settleMs);
    return;
  }

  const isPlaying = data.is_playing === true;
  if (!isPlaying) {
    scheduleNext(FAST_POLL_MS);
    return;
  }

  // Tether: if this track has just started (different from what we last
  // saw playing) and there's a tether registered for it, queue the
  // follow-up track. We do this only on transition so the queue-add fires
  // exactly once per playback of the trigger.
  if (s.lastSeenTrackId !== id) {
    s.lastSeenTrackId = id;
    const tether = getTetherForTrigger(id);
    if (tether) {
      console.log(
        `[session] tether: "${data.item.name}" → queueing "${tether.followName}"`
      );
      const ok = await addToQueue(token, tether.followId);
      if (!ok) {
        console.warn("[session] tether queue-add failed");
      } else {
        console.log("[session] tether queue-add succeeded");
      }
    } else {
      console.log(`[session] no tether for "${data.item.name}" (id=${id})`);
    }
  }

  const target = remaining - PRE_END_BUFFER_MS;
  if (target <= FAST_POLL_MS) {
    scheduleNext(FAST_POLL_MS);
  } else {
    scheduleNext(Math.min(target, MAX_POLL_MS));
  }
}

function scheduleNext(delayMs) {
  const s = S();
  if (!getSessionActive()) return;
  if (s.pollTimer) clearTimeout(s.pollTimer);
  s.pollTimer = setTimeout(tick, delayMs);
}

export function startSession({ accessToken, refreshToken, expiresAt }) {
  if (getSessionActive()) {
    console.log("[session] already active, ignoring start");
    return;
  }

  const s = S();
  s.cachedAccessToken = accessToken;
  s.cachedExpiresAt = expiresAt;
  s.cachedRefreshToken = refreshToken;
  s.recentlySkipped = new Map();
  s.lastSeenTrackId = null;

  setSessionActive(true);
  console.log("[session] started");
  scheduleNext(0);
}

export function stopSession() {
  const s = S();
  if (s.pollTimer) {
    clearTimeout(s.pollTimer);
    s.pollTimer = null;
  }
  setSessionActive(false);
  console.log("[session] stopped");
}

export function isSessionActive() {
  return getSessionActive();
}
