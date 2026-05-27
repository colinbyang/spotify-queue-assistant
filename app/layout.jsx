import "./globals.css";

export const metadata = {
  title: "FIFO — Spotify Queue Assistant",
  description: "Block tracks and keep your queue clean.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
