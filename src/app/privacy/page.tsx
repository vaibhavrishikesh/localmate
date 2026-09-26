"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "28px 18px 48px", fontFamily: "system-ui, sans-serif", color: "#1a2624", lineHeight: 1.5 }}>
      <p style={{ letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 12, color: "#5c6b66" }}>LocalMate · Legal</p>
      <h1 style={{ fontSize: 28, margin: "8px 0 6px" }}>Privacy Policy</h1>
      <p style={{ color: "#5c6b66", marginBottom: 20 }}>Last updated: 26 Sep 2026</p>

      <h2 style={{ fontSize: 18 }}>Who we are</h2>
      <p>LocalMate is a local task marketplace for Rishikesh (prototype). The Android app loads the service at localmate-omega.vercel.app.</p>

      <h2 style={{ fontSize: 18 }}>What we collect</h2>
      <p>Name, phone number (demo OTP), task details, offers, chat messages, and basic app usage needed to run the service. This prototype does not collect government ID photos or real card numbers.</p>

      <h2 style={{ fontSize: 18 }}>How we use data</h2>
      <p>To create accounts, connect customers and helpers, show tasks, simulate payment holds, and support safety features (blocks / flags).</p>

      <h2 style={{ fontSize: 18 }}>Sharing</h2>
      <p>Information you publish (tasks, public profile bits) can be seen by other LocalMate users. We do not sell personal data.</p>

      <h2 style={{ fontSize: 18 }}>Your choices</h2>
      <p>You may stop using the app at any time. For account deletion requests in this prototype, contact the developer operating the deployment.</p>

      <h2 style={{ fontSize: 18 }}>Contact</h2>
      <p>GitHub: <a href="https://github.com/vaibhavrishikesh/localmate">vaibhavrishikesh/localmate</a></p>

      <p style={{ marginTop: 28 }}><Link href="/">← LocalMate home</Link></p>
    </main>
  );
}
