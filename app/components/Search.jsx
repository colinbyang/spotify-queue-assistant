"use client";

import { useState, useEffect } from "react";

const DEBOUNCE_MS = 300;

export default function Search({ onBlockTrack, onBlockAlbum }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("track");
  const [results, setResults] = useState({ tracks: [], albums: [] });
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ tracks: [], albums: [] });
      return;
    }

    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/spotify/search?q=${encodeURIComponent(query)}&type=track,album&limit=8`
        );
        const data = await res.json();
        if (!cancelled) setResults(data);
      } catch {
        if (!cancelled) setResults({ tracks: [], albums: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  async function handleBlockTrack(track) {
    setBusyId(track.id);
    await onBlockTrack(track);
    setBusyId(null);
  }

  async function handleBlockAlbum(album) {
    setBusyId(album.id);
    await onBlockAlbum(album);
    setBusyId(null);
  }

  const items = tab === "track" ? results.tracks : results.albums;
  const showEmpty = !loading && query && items.length === 0;

  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 12 }}>
        Search
      </div>

      <input
        type="search"
        placeholder="Find a song or album to block..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, marginBottom: 4 }}>
        <div className="tabs">
          <button
            className={`tab ${tab === "track" ? "is-active" : ""}`}
            onClick={() => setTab("track")}
          >
            Tracks
            {results.tracks.length > 0 && (
              <span className="count-badge">{results.tracks.length}</span>
            )}
          </button>
          <button
            className={`tab ${tab === "album" ? "is-active" : ""}`}
            onClick={() => setTab("album")}
          >
            Albums
            {results.albums.length > 0 && (
              <span className="count-badge">{results.albums.length}</span>
            )}
          </button>
        </div>
        {loading && <span className="dim">Searching...</span>}
      </div>

      {showEmpty && <p className="empty">No results.</p>}
      {!query && (
        <p className="empty">Type something to search Spotify.</p>
      )}

      {items.length > 0 && (
        <ul className="list" style={{ marginTop: 8 }}>
          {items.map((item) => (
            <li key={item.id} className="list-item">
              <div className="list-item-main">
                {item.albumArt ? (
                  <img className="list-art" src={item.albumArt} alt="" />
                ) : (
                  <div className="list-art-placeholder" />
                )}
                <div className="list-text">
                  <div className="list-title">{item.name}</div>
                  <div className="list-sub">
                    {item.artist}
                    {tab === "track" && item.album ? ` — ${item.album}` : ""}
                    {tab === "album" && ` · ${item.totalTracks} tracks`}
                  </div>
                </div>
              </div>
              <button
                className="btn-danger btn-sm"
                disabled={busyId === item.id}
                onClick={() =>
                  tab === "track"
                    ? handleBlockTrack(item)
                    : handleBlockAlbum(item)
                }
              >
                {busyId === item.id ? "Adding..." : "Block"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
