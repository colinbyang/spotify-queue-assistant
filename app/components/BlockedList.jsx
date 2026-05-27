"use client";

import { useState, useEffect } from "react";

export default function BlockedList({ currentTrack, refreshKey, onChanged }) {
  const [blocked, setBlocked] = useState([]);

  useEffect(() => {
    fetch("/api/blocked")
      .then((r) => r.json())
      .then(setBlocked)
      .catch(() => {});
  }, [refreshKey]);

  async function blockCurrent() {
    if (!currentTrack) return;
    const res = await fetch("/api/blocked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: currentTrack.id,
        name: currentTrack.name,
        artist: currentTrack.artist,
      }),
    });
    setBlocked(await res.json());
    onChanged?.();
  }

  async function clearAll() {
    if (blocked.length === 0) return;
    if (!confirm(`Unblock all ${blocked.length} tracks?`)) return;
    const res = await fetch("/api/blocked", { method: "DELETE" });
    setBlocked(await res.json());
    onChanged?.();
  }

  async function remove(id) {
    const res = await fetch(`/api/blocked/${id}`, { method: "DELETE" });
    setBlocked(await res.json());
    onChanged?.();
  }

  return (
    <div className="card">
      <div className="card-row" style={{ marginBottom: 14 }}>
        <div className="card-title">
          Blocked
          {blocked.length > 0 && (
            <span className="count-badge">{blocked.length}</span>
          )}
        </div>
        <div className="app-row-actions">
          <button
            className="btn-ghost"
            onClick={clearAll}
            disabled={blocked.length === 0}
          >
            Clear all
          </button>
          <button
            className="btn-danger btn-sm"
            onClick={blockCurrent}
            disabled={!currentTrack}
          >
            Block current
          </button>
        </div>
      </div>

      {blocked.length === 0 ? (
        <p className="empty">
          No blocked tracks yet. Search above or block what&apos;s playing.
        </p>
      ) : (
        <ul className="list">
          {blocked.map((t) => (
            <li key={t.id} className="list-item">
              <div className="list-item-main">
                <div className="list-text">
                  <div className="list-title">{t.name}</div>
                  <div className="list-sub">{t.artist}</div>
                </div>
              </div>
              <button
                className="btn-ghost"
                onClick={() => remove(t.id)}
                title="Unblock"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
