// src/PrivacyPage.jsx
export default function PrivacyPage({ onBack }) {
  const link = { color: "#c8824a", cursor: "pointer" };
  const h2   = { fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1.1rem", color: "#3a2e26", marginBottom: "0.5rem" };
  const p    = { color: "#7a6a60", lineHeight: 1.8, fontSize: 14, fontFamily: "'Lato', sans-serif" };
  const ul   = { color: "#7a6a60", lineHeight: 1.8, fontSize: 14, fontFamily: "'Lato', sans-serif", paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: 4 };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(145deg, #faf6f0 0%, #f5ece0 100%)", fontFamily: "'Lato', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;800&family=Lato:wght@400;500;700&display=swap" rel="stylesheet" />

      {/* Navbar */}
      <div style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e8ddd0", padding: "0 24px", height: 64, display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #c8824a, #e8c87a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🎭</div>
        <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 18, color: "#3a2e26" }}>LifeStage</span>
        <button onClick={onBack} style={{ marginLeft: "auto", background: "none", border: "1px solid #e0d0c0", borderRadius: 20, padding: "6px 16px", color: "#a08878", cursor: "pointer", fontSize: 13, fontFamily: "'Lato', sans-serif" }}>
          ← Back
        </button>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c8824a", background: "#fdf0e6", padding: "4px 12px", borderRadius: 999, marginBottom: 12 }}>Legal</span>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: "clamp(1.75rem, 4vw, 2.5rem)", color: "#3a2e26", marginBottom: 8 }}>Privacy Policy</h1>
          <div style={{ width: 48, height: 4, background: "#c8824a", borderRadius: 999, margin: "12px 0 16px" }} />
          <p style={{ ...p, fontSize: 15 }}>Last updated: March 2025</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

          <div>
            <h2 style={h2}>1. Who We Are</h2>
            <p style={p}>LifeStage (<strong>lifestage.uzalike.com</strong>) is a social platform operated by UzaLike, built by <a href="https://www.pyisoe.com" target="_blank" rel="noopener" style={link}>PS Solutions</a>. For any privacy enquiries, contact us at <a href="mailto:admin@uzalike.com" style={link}>admin@uzalike.com</a>.</p>
          </div>

          <div>
            <h2 style={h2}>2. What Data We Collect</h2>
            <p style={p}>We collect only the data necessary to deliver our service:</p>
            <ul style={ul}>
              <li><strong>Account information</strong> — display name, username, email address, and password (hashed) when you register.</li>
              <li><strong>Profile data</strong> — avatar, bio, and any other information you voluntarily add to your profile.</li>
              <li><strong>Content data</strong> — posts, images, audio, and comments you create on the platform.</li>
              <li><strong>Usage data</strong> — browser type, device type, and session activity collected for performance and security purposes.</li>
              <li><strong>OAuth data</strong> — if you sign in via Google, Facebook, Microsoft, or LinkedIn, we receive your name and email from that provider.</li>
            </ul>
          </div>

          <div>
            <h2 style={h2}>3. How We Use Your Data</h2>
            <ul style={ul}>
              <li>To provide, operate, and improve the LifeStage platform.</li>
              <li>To authenticate your identity and secure your account.</li>
              <li>To send service-related notifications (not marketing, unless you opt in).</li>
              <li>To comply with legal obligations.</li>
              <li>To protect the safety and security of our users.</li>
            </ul>
          </div>

          <div>
            <h2 style={h2}>4. Data Sharing</h2>
            <p style={p}>We do not sell, rent, or trade your personal data. We may share data with trusted third-party service providers (Microsoft Azure for cloud infrastructure and storage) solely to operate the platform. These providers are bound by their own privacy commitments. We may also disclose data where required by law.</p>
          </div>

          <div>
            <h2 style={h2}>5. Data Retention</h2>
            <p style={p}>We retain your personal data for the duration of your account. You may request deletion at any time by contacting <a href="mailto:admin@uzalike.com" style={link}>admin@uzalike.com</a>. Posts and content you delete are removed from public view immediately.</p>
          </div>

          <div>
            <h2 style={h2}>6. Cookies</h2>
            <p style={p}>LifeStage uses essential cookies for authentication (JWT token storage) and session management. We do not use advertising or third-party tracking cookies. You may clear cookies in your browser settings, though this will sign you out.</p>
          </div>

          <div>
            <h2 style={h2}>7. Media Storage</h2>
            <p style={p}>Images and audio files you upload are stored securely in Microsoft Azure Blob Storage. Files are accessible via a direct URL once uploaded. Please do not upload content you do not have rights to share.</p>
          </div>

          <div>
            <h2 style={h2}>8. Your Rights</h2>
            <p style={p}>You have the right to:</p>
            <ul style={ul}>
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your account and data.</li>
              <li>Object to or restrict certain processing activities.</li>
            </ul>
            <p style={{ ...p, marginTop: 8 }}>To exercise any of these rights, contact us at <a href="mailto:admin@uzalike.com" style={link}>admin@uzalike.com</a>. We will respond within 30 days.</p>
          </div>

          <div>
            <h2 style={h2}>9. Security</h2>
            <p style={p}>We implement appropriate technical measures including HTTPS encryption, hashed passwords, JWT authentication, and secure Azure cloud infrastructure. No method of internet transmission is 100% secure, but we are committed to industry best practices.</p>
          </div>

          <div>
            <h2 style={h2}>10. Changes to This Policy</h2>
            <p style={p}>We may update this Privacy Policy from time to time. The "Last updated" date at the top reflects the most recent revision. Continued use after changes constitutes acceptance.</p>
          </div>

          <div>
            <h2 style={h2}>11. Contact</h2>
            <p style={p}><strong>LifeStage / UzaLike</strong><br />
              Built by <a href="https://www.pyisoe.com" target="_blank" rel="noopener" style={link}>PS Solutions</a><br />
              <a href="mailto:admin@uzalike.com" style={link}>admin@uzalike.com</a>
            </p>
          </div>

        </div>

        {/* Footer nav */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #e8ddd0", display: "flex", alignItems: "center" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "#c8824a", cursor: "pointer", fontSize: 13, fontFamily: "'Lato', sans-serif", padding: 0 }}>← Back</button>
          <span style={{ color: "#c8bab0", margin: "0 12px" }}>·</span>
          <button onClick={() => window.dispatchEvent(new CustomEvent("ls:navigate", { detail: "terms" }))} style={{ background: "none", border: "none", color: "#c8824a", cursor: "pointer", fontSize: 13, fontFamily: "'Lato', sans-serif", padding: 0 }}>Terms &amp; Conditions</button>
        </div>

      </div>
    </div>
  );
}
