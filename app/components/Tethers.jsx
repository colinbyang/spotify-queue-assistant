"use client";

import { useState, useEffect } from "react";

const DEBOUNCE_MS = 300;

export default function Tethers({ refreshKey, onChanged, flash, sessionActive }) {
  const [tethers, setTethers] = useState([]);
  const [trigger, setTrigger] = useState(null);
  const [follow, setFollow] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/tethers")
      .then((r) => r.json())
      .then(setTethers)
      .catch(() => {});
  }, [refreshKey]);

  async function save() {
    if (!trigger || !follow) return;
    setBusy(true);
    const res = await fetch("/api/tethers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        triggerId: trigger.id,
        triggerName: trigger.name,
        triggerArtist: trigger.artist,
        followId: follow.id,
        followName: follow.name,
        followArtist: follow.artist,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setTethers(await res.json());
      setTrigger(null);
      setFollow(null);
      onChanged?.();
      if (sessionActive) {
        flash?.(`Tethered "${trigger.name}" → "${follow.name}"`);
      } else {
        flash?.("Tether saved. Start the session monitor to activate it.");
      }
    }
  }

  async function remove(triggerId) {
    const res = await fetch(`/api/tethers/${triggerId}`, { method: "DELETE" });
    setTethers(await res.json());
    onChanged?.();
  }

  async function clearAll() {
    if (tethers.length === 0) return;
    if (!confirm(`Remove all ${tethers.length} tethers?`)) return;
    const res = await fetch("/api/tethers", { method: "DELETE" });
    setTethers(await res.json());
    onChanged?.();
  }

  return (
    <div className="card">
      <div className="card-row" style={{ marginBottom: 14 }}>
        <div className="card-title">
          Tethers
          {tethers.length > 0 && (
            <span className="count-badge">{tethers.length}</span>
          )}
        </div>
        <button
          className="btn-ghost"
          onClick={clearAll}
          disabled={tethers.length === 0}
        >
          Clear all
        </button>
      </div>

      <p className="muted" style={{ marginBottom: 14, fontSize: "0.825rem" }}>
        When the trigger song plays, the follow-up song is added to your queue.
        Requires an active session monitor.
      </p>

      {!sessionActive && (
        <div
          style={{
            background: "rgba(216, 142, 0, 0.1)",
            border: "1px solid rgba(216, 142, 0, 0.4)",
            color: "var(--warn)",
            padding: "10px 14px",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.825rem",
            marginBottom: 14,
            fontWeight: 600,
          }}
        >
          ⚠ Session monitor is idle. Tethers won&apos;t fire until you start it
          above.
        </div>
      )}

      <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
        <TrackPicker
          label="When this plays"
          selected={trigger}
          onSelect={setTrigger}
          disallowedId={follow?.id}
        />
        <div
          style={{
            textAlign: "center",
            color: "var(--text-dim)",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          ↓ queue ↓
        </div>
        <TrackPicker
          label="Queue this"
          selected={follow}
          onSelect={setFollow}
          disallowedId={trigger?.id}
        />
      </div>

      <button
        className="btn-primary"
        style={{ width: "100%" }}
        onClick={save}
        disabled={!trigger || !follow || busy}
      >
        {busy ? "Saving..." : "Save tether"}
      </button>

      {tethers.length > 0 && (
        <>
          <div className="divider" style={{ marginTop: 18 }} />
          <ul className="list">
            {tethers.map((t) => (
              <li key={t.triggerId} className="list-item">
                <div className="list-item-main">
                  <div className="list-text">
                    <div className="list-title">
                      {t.triggerName}
                      <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>
                        {" → "}
                      </span>
                      {t.followName}
                    </div>
                    <div className="list-sub">
                      {t.triggerArtist} → {t.followArtist}
                    </div>
                  </div>
                </div>
                <button
                  className="btn-ghost"
                  onClick={() => remove(t.triggerId)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/**
 * A small inline track-search picker. Type to search Spotify, click a result
 * to select, or use the X button to clear and search again.
 */
function TrackPicker({ label, selected, onSelect, disallowedId }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selected) return; // don't search while a selection is active
    if (!query.trim()) {
      setResults([]);
      return;
    }

    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/spotify/search?q=${encodeURIComponent(query)}&type=track&limit=5`
        );
        const data = await res.json();
        if (!cancelled) setResults(data.tracks ?? []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, selected]);

  if (selected) {
    return (
      <div
        style={{
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          padding: 10,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="list-title">{selected.name}</div>
          <div className="list-sub">{selected.artist}</div>
        </div>
        <button
          className="btn-ghost"
          onClick={() => onSelect(null)}
          style={{ padding: "4px 10px" }}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          fontSize: "0.7rem",
          color: "var(--text-dim)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <input
        type="search"
        placeholder="Search for a track..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {loading && (
        <p className="dim" style={{ marginTop: 6, fontSize: "0.75rem" }}>
          Searching...
        </p>
      )}
      {results.length > 0 && (
        <ul
          className="list"
          style={{
            marginTop: 6,
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "4px 8px",
            maxHeight: 220,
          }}
        >
          {results.map((t) => {
            const disabled = t.id === disallowedId;
            return (
              <li
                key={t.id}
                className="list-item"
                style={{
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.4 : 1,
                }}
                onClick={() => {
                  if (disabled) return;
                  onSelect(t);
                  setQuery("");
                  setResults([]);
                }}
              >
                <div className="list-item-main">
                  {t.albumArt ? (
                    <img className="list-art" src={t.albumArt} alt="" />
                  ) : (
                    <div className="list-art-placeholder" />
                  )}
                  <div className="list-text">
                    <div className="list-title">{t.name}</div>
                    <div className="list-sub">{t.artist}</div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
