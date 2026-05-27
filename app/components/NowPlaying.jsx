"use client";

export default function NowPlaying({ track, isPlaying }) {
  if (!track) {
    return (
      <div className="card">
        <div className="np">
          <div className="np-art-placeholder">♪</div>
          <div className="np-info">
            <div className="np-title">Nothing playing</div>
            <div className="np-artist">
              Start playback in Spotify and it&apos;ll show up here.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progress = Math.min(
    100,
    Math.round((track.progress_ms / track.duration_ms) * 100)
  );

  return (
    <div className="card">
      <div className="np">
        {track.albumArt ? (
          <img className="np-art" src={track.albumArt} alt={track.album} />
        ) : (
          <div className="np-art-placeholder">♪</div>
        )}
        <div className="np-info">
          <div className="np-title">{track.name}</div>
          <div className="np-artist">{track.artist}</div>
          <div className="np-album">{track.album}</div>
          <div className="np-meta">
            {isPlaying ? (
              <span
                className="playing-indicator"
                aria-label="Playing"
                title="Playing"
              >
                <span /><span /><span />
              </span>
            ) : (
              <span className="paused-indicator" title="Paused">| |</span>
            )}
            <span className="dim" style={{ fontSize: "0.75rem" }}>
              {isPlaying ? "Playing" : "Paused"}
            </span>
          </div>
        </div>
      </div>
      <div className="np-progress">
        <div className="np-progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
