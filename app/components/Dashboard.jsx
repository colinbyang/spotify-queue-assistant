"use client";

import { useState, useEffect } from "react";
import NowPlaying from "./NowPlaying";
import BlockedList from "./BlockedList";
import SessionControl from "./SessionControl";
import Search from "./Search";
import Tethers from "./Tethers";

const POLL_MS = 4000;

export default function Dashboard() {
  const [track, setTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [blockedRefreshKey, setBlockedRefreshKey] = useState(0);
  const [tethersRefreshKey, setTethersRefreshKey] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [tab, setTab] = useState("blocking");

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const res = await fetch("/api/spotify/currently-playing");
        const data = await res.json();
        if (!active) return;

        if (data.playing && data.track) {
          setTrack(data.track);
          setIsPlaying(data.playing);
        } else {
          setTrack(null);
          setIsPlaying(false);
        }
      } catch {
        // ignore
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  function flash(msg) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  }

  async function blockTrack(track) {
    const res = await fetch("/api/blocked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: track.id,
        name: track.name,
        artist: track.artist,
      }),
    });
    if (res.ok) {
      setBlockedRefreshKey((k) => k + 1);
      flash(`Blocked "${track.name}"`);
    }
  }

  async function blockAlbum(album) {
    const res = await fetch(`/api/spotify/album/${album.id}/tracks`);
    if (!res.ok) {
      flash("Couldn't load album tracks.");
      return;
    }
    const data = await res.json();

    const addRes = await fetch("/api/blocked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tracks: data.tracks }),
    });

    if (addRes.ok) {
      setBlockedRefreshKey((k) => k + 1);
      flash(`Blocked ${data.tracks.length} tracks from "${album.name}"`);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">FIFO</div>
          <div>
            <div className="brand-name">FIFO</div>
            <div className="brand-sub">Queue assistant</div>
          </div>
        </div>

        <div className="app-row-actions">
          <span className={`status-pill ${sessionActive ? "is-active" : ""}`}>
            <span className="status-dot" />
            {sessionActive ? "Monitoring" : "Idle"}
          </span>
          <button className="btn-secondary btn-sm" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {feedback && <div className="toast">✓ {feedback}</div>}

      <NowPlaying track={track} isPlaying={isPlaying} />
      <SessionControl onStatusChange={setSessionActive} />

      <div
        className="tabs"
        style={{ width: "100%", marginBottom: 14, justifyContent: "stretch" }}
      >
        <button
          className={`tab ${tab === "blocking" ? "is-active" : ""}`}
          onClick={() => setTab("blocking")}
          style={{ flex: 1 }}
        >
          🚫 Blocking
        </button>
        <button
          className={`tab ${tab === "tethers" ? "is-active" : ""}`}
          onClick={() => setTab("tethers")}
          style={{ flex: 1 }}
        >
          🔗 Tethers
        </button>
      </div>

      {tab === "blocking" ? (
        <>
          <Search onBlockTrack={blockTrack} onBlockAlbum={blockAlbum} />
          <BlockedList
            currentTrack={track}
            refreshKey={blockedRefreshKey}
            onChanged={() => setBlockedRefreshKey((k) => k + 1)}
          />
        </>
      ) : (
        <Tethers
          sessionActive={sessionActive}
          refreshKey={tethersRefreshKey}
          onChanged={() => setTethersRefreshKey((k) => k + 1)}
          flash={flash}
        />
      )}
    </div>
  );
}
