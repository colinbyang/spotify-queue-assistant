import { NextResponse } from "next/server";
import { generateRandomString, SPOTIFY_SCOPES } from "@/lib/spotify";
import { recordOAuthState } from "@/lib/store";

// Step 1: Redirect the user to Spotify's authorization page.
// We generate a random `state` value and store it in a SERVER-SIDE map
// (not a cookie) so we can verify it when Spotify redirects back.
// Server-side storage avoids browser cookie quirks on redirects.
export async function GET() {
  const state = generateRandomString(32);
  recordOAuthState(state);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope: SPOTIFY_SCOPES,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    state,
    show_dialog: "true", // force the consent dialog so account-switching works
  });

  const url = `https://accounts.spotify.com/authorize?${params.toString()}`;
  console.log("[auth/login] generated state:", state);
  return NextResponse.redirect(url);
}
