# Spotify Queue Assistant

A Next.js companion web app that monitors your Spotify playback and auto-skips blocked tracks.

## Features (MVP)

- Connect your Spotify account via OAuth (Authorization Code flow)
- Tokens stored in **HTTP-only cookies** (not accessible to JavaScript)
- See currently playing track in real-time
- Maintain a blocked tracks list
- Start a session that auto-skips blocked tracks

## Prerequisites

- Node.js 18.18+
- A Spotify Premium account (skip control requires Premium)
- A Spotify Developer App (https://developer.spotify.com/dashboard)

## Setup

### 1. Spotify Developer Dashboard

1. Create an app at https://developer.spotify.com/dashboard
2. Set the Redirect URI to: `http://127.0.0.1:3000/api/auth/callback`
3. Check the **Web API** box
4. Note your Client ID and Client Secret

### 2. Local environment

```bash
# Copy the template and fill in your credentials
cp .env.example .env.local
```

Edit `.env.local`:

```
SPOTIFY_CLIENT_ID=your_real_client_id
SPOTIFY_CLIENT_SECRET=your_real_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback
```

### 3. Install and run

```bash
npm install
npm run dev
```

Open http://127.0.0.1:3000 in your browser.

## OAuth Flow

```
1. User clicks "Connect Spotify"
2. Browser → /api/auth/login
   → generates random state, stores in temp cookie
   → redirects to https://accounts.spotify.com/authorize
3. User approves on Spotify
4. Spotify → /api/auth/callback?code=...&state=...
   → verifies state matches the temp cookie
   → exchanges code for access + refresh tokens (server-side)
   → stores tokens in HTTP-only cookies
   → redirects to /
5. The home page reads cookies on the server and shows the dashboard
```

## Project Structure

```
app/
  layout.jsx                    Root layout
  page.jsx                      Home page (auth-aware)
  globals.css                   Styles
  components/
    LoginScreen.jsx             "Connect Spotify" screen
    Dashboard.jsx               Authed UI shell
    NowPlaying.jsx              Current track display
    BlockedList.jsx             Manage blocked tracks
    SessionControl.jsx          Start/stop monitor
  api/
    auth/
      login/route.js            Redirect to Spotify
      callback/route.js         Handle Spotify redirect, set cookies
      logout/route.js           Clear cookies
      status/route.js           Check auth state
    player/
      now-playing/route.js      Read current track
    blocked/
      route.js                  GET, POST blocked tracks
      [id]/route.js             DELETE blocked track
    session/
      start/route.js            Start auto-skip monitor
      stop/route.js             Stop monitor
      status/route.js           Get monitor state
lib/
  spotify.js                    Token exchange + API helpers
  auth.js                       Cookie-based token management
  session.js                    Background polling + skip logic
  store.js                      In-memory blocked list & session state
```
