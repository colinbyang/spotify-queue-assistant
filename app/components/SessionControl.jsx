"use client";

import { useState, useEffect } from "react";

export default function SessionControl({ onStatusChange }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    fetch("/api/session/status")
      .then((r) => r.json())
      .then((data) => {
        setActive(data.active);
        onStatusChange?.(data.active);
      })
      .catch(() => {});
  }, [onStatusChange]);

  async function toggle() {
    const endpoint = active ? "/api/session/stop" : "/api/session/start";
    const res = await fetch(endpoint, { method: "POST" });
    const data = await res.json();
    setActive(data.active);
    onStatusChange?.(data.active);
  }

  return (
    <div className="card">
      <div className="card-row">
        <div>
          <div className="card-title">Auto-skip session</div>
          <p className="muted" style={{ marginTop: 4 }}>
            {active
              ? "FIFO is watching playback — skipping blocked tracks and firing tethers."
              : "Start a session to enable auto-skipping and tethers. Keeps running even with this tab closed."}
          </p>
        </div>
        <button
          className={active ? "btn-danger" : "btn-primary"}
          onClick={toggle}
        >
          {active ? "Stop" : "Start session"}
        </button>
      </div>
    </div>
  );
}
