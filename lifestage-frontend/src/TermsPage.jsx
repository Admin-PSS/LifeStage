// src/TermsPage.jsx
export default function TermsPage({ onBack }) {
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
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: "clamp(1.75rem, 4vw, 2.5rem)", color: "#3a2e26", marginBottom: 8 }}>Terms &amp; Conditions</h1>
          <div style={{ width: 48, height: 4, background: "#c8824a", borderRadius: 999, margin: "12px 0 16px" }} />
          <p style={{ ...p, fontSize: 15 }}>Last updated: March 2025</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

          <div>
            <h2 style={h2}>1. Agreement to Terms</h2>
            <p style={p}>By accessing or using LifeStage at <strong>lifestage.uzalike.com</strong>, you agree to be bound by these Terms &amp; Conditions. If you do not agree, please discontinue use immediately.</p>
          </div>

          <div>
            <h2 style={h2}>2. Our Platform</h2>
            <p style={p}>LifeStage is a social platform that lets you share moments, stories, images, and music with your community. Features include:</p>
            <ul style={ul}>
              <li>Creating and sharing posts with text, images, and audio</li>
              <li>Following other users and engaging with their content</li>
              <li>Liking, commenting, and reposting content</li>
              <li>Direct messaging with other users</li>
              <li>Personalising your profile</li>
            </ul>
          </div>

          <div>
            <h2 style={h2}>3. User Accounts</h2>
            <p style={p}>You are responsible for maintaining the security of your account credentials and for all activity under your account. You must provide accurate registration information and notify us immediately of any unauthorised use at <a href="mailto:admin@uzalike.com" style={link}>admin@uzalike.com</a>.</p>
          </div>

          <div>
            <h2 style={h2}>4. Acceptable Use</h2>
            <p style={p}>When using LifeStage, you agree not to:</p>
            <ul style={ul}>
              <li>Violate any applicable local, national, or international law or regulation.</li>
              <li>Upload or share harmful, offensive, defamatory, or unlawful content.</li>
              <li>Harass, bully, or threaten other users.</li>
              <li>Infringe the intellectual property rights of others.</li>
              <li>Attempt to gain unauthorised access to any system or account.</li>
              <li>Use the platform for spam or automated scraping.</li>
            </ul>
          </div>

          <div>
            <h2 style={h2}>5. Your Content</h2>
            <p style={p}>You retain ownership of content you post on LifeStage. By posting, you grant LifeStage a non-exclusive, worldwide licence to display, store, and distribute your content as necessary to operate the service. You are solely responsible for your content and must ensure it does not violate any third-party rights.</p>
          </div>

          <div>
            <h2 style={h2}>6. Intellectual Property</h2>
            <p style={p}>All platform content — including design, code, and branding — is the property of UzaLike / PS Solutions or its licensors. You may not reproduce or distribute any part of the platform without express written consent.</p>
          </div>

          <div>
            <h2 style={h2}>7. Third-Party Services</h2>
            <p style={p}>LifeStage integrates with third-party services including Microsoft Azure, cloud storage, and social login providers (Google, Facebook, Microsoft, LinkedIn). Use of those services is governed by their respective terms.</p>
          </div>

          <div>
            <h2 style={h2}>8. Disclaimer of Warranties</h2>
            <p style={p}>LifeStage is provided "as is" without warranties of any kind. We do not warrant uninterrupted or error-free service. We reserve the right to modify or discontinue any feature at any time with reasonable notice.</p>
          </div>

          <div>
            <h2 style={h2}>9. Limitation of Liability</h2>
            <p style={p}>To the fullest extent permitted by law, UzaLike / PS Solutions shall not be liable for any indirect, incidental, or consequential damages arising from your use of LifeStage.</p>
          </div>

          <div>
            <h2 style={h2}>10. Privacy</h2>
            <p style={p}>Your use of LifeStage is also governed by our <span onClick={onBack} style={link}>Privacy Policy</span>, which is incorporated into these Terms by reference.</p>
          </div>

          <div>
            <h2 style={h2}>11. Changes to These Terms</h2>
            <p style={p}>We may update these Terms from time to time. The "Last updated" date at the top reflects the most recent revision. Continued use after changes constitutes acceptance.</p>
          </div>

          <div>
            <h2 style={h2}>12. Governing Law</h2>
            <p style={p}>These Terms are governed by applicable law. Any disputes shall be resolved through good-faith negotiation in the first instance.</p>
          </div>

          <div>
            <h2 style={h2}>13. Contact</h2>
            <p style={p}><strong>LifeStage / UzaLike</strong><br />
              Built by <a href="https://www.pyisoe.com" target="_blank" rel="noopener" style={link}>PS Solutions</a><br />
              <a href="mailto:admin@uzalike.com" style={link}>admin@uzalike.com</a>
            </p>
          </div>

        </div>

        {/* Footer nav */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #e8ddd0", display: "flex", alignItems: "center", gap: 0 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "#c8824a", cursor: "pointer", fontSize: 13, fontFamily: "'Lato', sans-serif", padding: 0 }}>← Back</button>
          <span style={{ color: "#c8bab0", margin: "0 12px" }}>·</span>
          <button onClick={() => window.dispatchEvent(new CustomEvent("ls:navigate", { detail: "privacy" }))} style={{ background: "none", border: "none", color: "#c8824a", cursor: "pointer", fontSize: 13, fontFamily: "'Lato', sans-serif", padding: 0 }}>Privacy Policy</button>
        </div>

      </div>
    </div>
  );
}
