export default function LoginScreen({ error }) {
  return (
    <div className="login">
      <div className="login-mark">FIFO</div>
      <h1>Keep your queue clean</h1>
      <p>
        Connect your Spotify account and FIFO will quietly skip past tracks
        you&apos;ve blocked while you listen.
      </p>

      <a href="/api/auth/login">
        <button className="btn-primary">Connect Spotify</button>
      </a>

      {error && (
        <p className="login-error">Login failed: {error}</p>
      )}
    </div>
  );
}
