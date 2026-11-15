import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dhaaga | Care, connected",
  description: "A shared care circle for medication and appointment support.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <header className="site-header">
          <Link className="brand" href="/">Dhaaga</Link>
          <span className="muted">Care, connected.</span>
        </header>
        {children}
        <footer className="site-footer">Your care circle, with the elder at its centre.</footer>
      </body>
    </html>
  );
}
