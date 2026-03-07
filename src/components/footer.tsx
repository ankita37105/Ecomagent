import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        backgroundColor: "#090909",
        borderTop: "1px solid #1a1a1a",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          marginInline: "auto",
          paddingInline: "24px",
          paddingTop: "60px",
          paddingBottom: "40px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "40px",
            marginBottom: "48px",
          }}
        >
          {/* Brand */}
          <div>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                fontWeight: 700,
                fontSize: "14px",
                color: "#f0f0f0",
                textDecoration: "none",
                marginBottom: "12px",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "16px",
                  height: "16px",
                  borderRadius: "4px",
                  backgroundColor: "#f59e0b",
                  marginRight: "8px",
                  flexShrink: 0,
                }}
              />
              ecomagent<span style={{ color: "#f59e0b" }}>.in</span>
            </Link>
            <p style={{ fontSize: "12px", color: "#777", lineHeight: 1.65, maxWidth: "200px" }}>
              Unlimited Claude access for developers who ship every day.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 style={{ fontSize: "11px", fontWeight: 700, color: "#f0f0f0", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "16px" }}>Product</h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { href: "/#what-we-do", label: "What We Do" },
                { href: "/#setup", label: "How It Works" },
                { href: "/#pricing", label: "Pricing" },
                { href: "/docs", label: "Docs" },
                { href: "/blog", label: "Blog" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover-amber" style={{ fontSize: "13px" }}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Models */}
          <div>
            <h4 style={{ fontSize: "11px", fontWeight: 700, color: "#f0f0f0", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "16px" }}>Models</h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
              <li><span style={{ fontSize: "13px", color: "#777" }}>Claude Opus</span></li>
              <li><span style={{ fontSize: "13px", color: "#777" }}>Claude Sonnet 4.6</span></li>
              <li>
                <Link href="/docs" className="hover-amber" style={{ fontSize: "13px" }}>Claude Code Setup</Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 style={{ fontSize: "11px", fontWeight: 700, color: "#f0f0f0", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "16px" }}>Support</h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
              <li><Link href="/login" className="hover-amber" style={{ fontSize: "13px" }}>Log In</Link></li>
              <li><Link href="/signup" className="hover-amber" style={{ fontSize: "13px" }}>Create Account</Link></li>
              <li>
                <a
                  href="https://t.me/legit_is_back"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover-amber"
                  style={{ fontSize: "13px" }}
                >
                  Contact Sales
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid #1a1a1a",
            paddingTop: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <p style={{ fontSize: "12px", color: "#666" }}>
            &copy; {new Date().getFullYear()} ecomagent.in — All rights reserved.
          </p>
          <p style={{ fontSize: "12px", color: "#555" }}>Built for Claude Code users.</p>
        </div>
      </div>
    </footer>
  );
}

