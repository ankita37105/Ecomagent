import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import FAQSection from "@/components/faq-section";
import { Check } from "lucide-react";

export default function HomePage() {
  return (
    <>
      <Navbar />

      {/* ─── HERO ─── */}
      <section
        style={{
          paddingTop: "120px",
          paddingBottom: "80px",
          backgroundColor: "#090909",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle dot grid */}
        <div
          className="bg-dots"
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.5,
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            maxWidth: "1200px",
            marginInline: "auto",
            paddingInline: "24px",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Split grid */}
          <div
            style={{
              display: "grid",
              gap: "60px",
              alignItems: "center",
            }}
            className="hero-grid"
          >
            {/* Left: text */}
            <div style={{ maxWidth: "600px" }}>
              <div className="badge-amber animate-fade-in-up" style={{ marginBottom: "28px" }}>
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    backgroundColor: "#22c55e",
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                Unlimited Claude Opus + Sonnet 4.6 — Live
              </div>

              <h1
                className="animate-fade-in-up delay-100"
                style={{
                  fontSize: "clamp(38px, 5vw, 64px)",
                  fontWeight: 800,
                  lineHeight: 1.08,
                  letterSpacing: "-0.03em",
                  color: "#f0f0f0",
                  marginBottom: "24px",
                }}
              >
                Code without<br />
                <span style={{ color: "#f59e0b" }}>token limits.</span>
              </h1>

              <p
                className="animate-fade-in-up delay-200"
                style={{
                  fontSize: "17px",
                  lineHeight: 1.7,
                  color: "#888",
                  marginBottom: "36px",
                  maxWidth: "480px",
                }}
              >
                One API key. One endpoint. Unlimited Claude Opus and Sonnet 4.6
                for developers who use Claude Code every day — no chatbot web UI,
                no token anxiety.
              </p>

              <div
                className="animate-fade-in-up delay-300"
                style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}
              >
                <Link href="/signup" className="btn-primary">
                  Start Free Trial →
                </Link>
                <Link href="/docs" className="btn-outline">
                  View Docs
                </Link>
              </div>

              {/* Mini stats row */}
              <div
                style={{
                  marginTop: "48px",
                  display: "flex",
                  gap: "32px",
                  flexWrap: "wrap",
                  borderTop: "1px solid #1a1a1a",
                  paddingTop: "32px",
                }}
              >
                {[
                  { value: "Opus + Sonnet 4.6", label: "Models" },
                  { value: "Unlimited tokens", label: "Paid plans" },
                  { value: "3-step setup", label: "Minutes to go live" },
                ].map((s) => (
                  <div key={s.label}>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "#f59e0b" }}>{s.value}</p>
                    <p style={{ fontSize: "12px", color: "#555", marginTop: "2px" }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Terminal code window */}
            <div
              className="animate-fade-in-up delay-200"
              style={{ width: "100%" }}
            >
              <div
                style={{
                  backgroundColor: "#0d0d0d",
                  border: "1px solid #242424",
                  borderRadius: "14px",
                  overflow: "hidden",
                  fontFamily: "var(--font-mono), monospace",
                }}
              >
                {/* Titlebar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "12px 16px",
                    borderBottom: "1px solid #1a1a1a",
                    backgroundColor: "#141414",
                  }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#ef4444", display: "block" }} />
                  <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#f59e0b", display: "block" }} />
                  <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#22c55e", display: "block" }} />
                  <span style={{ marginLeft: "auto", fontSize: "11px", color: "#444" }}>~/.claude/settings.json</span>
                </div>
                {/* Code content */}
                <pre
                  style={{
                    padding: "24px",
                    fontSize: "13px",
                    lineHeight: 1.8,
                    overflowX: "auto",
                    color: "#888",
                  }}
                >
                  <code>{`{
  `}<span style={{ color: "#93c5fd" }}>&quot;env&quot;</span>{`: {
    `}<span style={{ color: "#93c5fd" }}>&quot;ANTHROPIC_BASE_URL&quot;</span>{`: `}<span style={{ color: "#a3e635" }}>&quot;https://api.ecomagent.in/&quot;</span>{`,
    `}<span style={{ color: "#93c5fd" }}>&quot;ANTHROPIC_AUTH_TOKEN&quot;</span>{`: `}<span style={{ color: "#a3e635" }}>&quot;eca_sk_xxxxxxxxxxxx&quot;</span>{`
  }
}`}</code>
                </pre>
                {/* Footer bar */}
                <div
                  style={{
                    borderTop: "1px solid #1a1a1a",
                    padding: "10px 24px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "11px", color: "#444" }}>2 env vars · ready to use</span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#22c55e",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#22c55e", display: "inline-block" }} />
                    Connected
                  </span>
                </div>
              </div>

              {/* Steps below the code window */}
              <div
                style={{
                  marginTop: "16px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "12px",
                }}
              >
                {["Sign up free", "Get API key", "Paste + code"].map((step, i) => (
                  <div
                    key={step}
                    style={{
                      backgroundColor: "#111",
                      border: "1px solid #1e1e1e",
                      borderRadius: "8px",
                      padding: "12px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "10px", color: "#f59e0b", fontWeight: 700, marginBottom: "4px" }}>
                      0{i + 1}
                    </div>
                    <div style={{ fontSize: "12px", color: "#888" }}>{step}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="what-we-do" style={{ padding: "80px 0", backgroundColor: "#0d0d0d" }}>
        <div style={{ maxWidth: "1200px", marginInline: "auto", paddingInline: "24px" }}>
          <div style={{ marginBottom: "56px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#f59e0b",
              }}
            >
              What We Do
            </span>
            <h2
              style={{
                fontSize: "clamp(26px, 3.5vw, 40px)",
                fontWeight: 800,
                letterSpacing: "-0.025em",
                color: "#f0f0f0",
                marginTop: "12px",
                marginBottom: "12px",
              }}
            >
              Everything builders need.<br />Nothing they don&apos;t.
            </h2>
            <p style={{ fontSize: "15px", color: "#666", maxWidth: "460px" }}>
              Stable endpoint, high request capacity, and no token stress on paid plans.
              Works exactly like the official Anthropic API.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            {[
              {
                num: "01",
                title: "Unlimited Token Usage",
                desc: "Premium and Premium+ plans include unlimited token usage. Write long prompts, run multi-step pipelines, and ship without cutoffs.",
              },
              {
                num: "02",
                title: "Claude Opus + Sonnet 4.6",
                desc: "Access the same top-tier models — Claude Opus and Sonnet 4.6 — with one API key and one stable endpoint built for Claude Code.",
              },
              {
                num: "03",
                title: "Daily Request Controls",
                desc: "Choose 3k, 6k, or fully unlimited requests per day. Predictable quotas so your workflows never get blindsided mid-session.",
              },
            ].map((f) => (
              <div
                key={f.num}
                className="card card-hover"
                style={{ padding: "32px" }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    color: "#f59e0b",
                    letterSpacing: "0.05em",
                    marginBottom: "16px",
                  }}
                >
                  {f.num}
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#f0f0f0", marginBottom: "10px" }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: "14px", lineHeight: 1.65, color: "#666" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMPARISON ─── */}
      <section id="compare-plans" style={{ padding: "80px 0", backgroundColor: "#090909" }}>
        <div style={{ maxWidth: "1200px", marginInline: "auto", paddingInline: "24px" }}>
          <div style={{ marginBottom: "48px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#f59e0b",
              }}
            >
              Plan Comparison
            </span>
            <h2
              style={{
                fontSize: "clamp(24px, 3.5vw, 38px)",
                fontWeight: 800,
                letterSpacing: "-0.025em",
                color: "#f0f0f0",
                marginTop: "12px",
              }}
            >
              Simple comparison for new buyers
            </h2>
            <p style={{ fontSize: "14px", color: "#555", marginTop: "8px" }}>
              API-first workflow vs chatbot-centric plans.
            </p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                backgroundColor: "#111",
                border: "1px solid #242424",
                borderRadius: "12px",
                overflow: "hidden",
                fontSize: "13.5px",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #1e1e1e" }}>
                  <th style={{ textAlign: "left", padding: "14px 20px", color: "#888", fontWeight: 600 }}>Feature</th>
                  <th style={{ padding: "14px 20px", color: "#f59e0b", fontWeight: 700 }}>EcomAgent Premium ($69)</th>
                  <th style={{ padding: "14px 20px", color: "#666", fontWeight: 600 }}>Claude Max $100</th>
                  <th style={{ padding: "14px 20px", color: "#666", fontWeight: 600 }}>Claude Max $200</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Models included", "Codex 5.4 + Opus 4.6 + Sonnet 4.6", "Limited / none", "Limited / none"],
                  ["Token usage", "Unlimited (paid plans)", "Not unlimited", "Not unlimited"],
                  ["Claude Code via API", "API endpoint + key", "Not API-first", "Not API-first"],
                  ["Req limit (Premium)", "3k / day · 90k / month", "N/A", "N/A"],
                  ["Tool integrations", "API-first", "Chatbot-centric", "Chatbot-centric"],
                  ["Best for", "Developers & API teams", "Higher chatbot usage", "Highest chatbot tier"],
                ].map((row, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: i < 5 ? "1px solid #1a1a1a" : "none" }}
                  >
                    <td style={{ padding: "13px 20px", color: "#888" }}>{row[0]}</td>
                    <td style={{ padding: "13px 20px", textAlign: "center", color: "#22c55e", fontWeight: 600 }}>{row[1]}</td>
                    <td style={{ padding: "13px 20px", textAlign: "center", color: "#666" }}>{row[2]}</td>
                    <td style={{ padding: "13px 20px", textAlign: "center", color: "#666" }}>{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── SETUP STEPS ─── */}
      <section id="setup" style={{ padding: "80px 0", backgroundColor: "#0d0d0d" }}>
        <div style={{ maxWidth: "1200px", marginInline: "auto", paddingInline: "24px" }}>
          <div style={{ marginBottom: "48px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#f59e0b",
              }}
            >
              How It Works
            </span>
            <h2
              style={{
                fontSize: "clamp(24px, 3.5vw, 38px)",
                fontWeight: 800,
                letterSpacing: "-0.025em",
                color: "#f0f0f0",
                marginTop: "12px",
              }}
            >
              Set up in 3 steps
            </h2>
            <p style={{ fontSize: "14px", color: "#555", marginTop: "8px" }}>
              Open Claude Code, paste two values, start coding.
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            {[
              {
                num: "01",
                title: "Open settings.json",
                desc: "Go to your local Claude Code configuration file.",
                note: "Windows: %USERPROFILE%\\.claude\\settings.json",
              },
              {
                num: "02",
                title: "Paste endpoint + API key",
                desc: "Add two lines to the env block — your EcomAgent endpoint and your key.",
                code: `"ANTHROPIC_BASE_URL": "https://api.ecomagent.in/"\n"ANTHROPIC_AUTH_TOKEN": "YOUR_API_KEY"`,
              },
              {
                num: "03",
                title: "Use Claude Code normally",
                desc: "Run prompts, vibe-code, build pipelines. Nothing else changes.",
              },
            ].map((s) => (
              <div
                key={s.num}
                className="card card-hover"
                style={{ padding: "32px" }}
              >
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: 900,
                    color: "#1e1e1e",
                    letterSpacing: "-0.04em",
                    marginBottom: "20px",
                    lineHeight: 1,
                  }}
                >
                  {s.num}
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#f0f0f0", marginBottom: "8px" }}>
                  {s.title}
                </h3>
                <p style={{ fontSize: "13.5px", color: "#666", marginBottom: "16px" }}>{s.desc}</p>
                {s.note && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#555",
                      backgroundColor: "#0d0d0d",
                      border: "1px solid #1a1a1a",
                      borderRadius: "7px",
                      padding: "8px 12px",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {s.note}
                  </div>
                )}
                {s.code && (
                  <pre
                    style={{
                      fontSize: "12px",
                      color: "#a3e635",
                      backgroundColor: "#0a0a0a",
                      border: "1px solid #1a1a1a",
                      borderRadius: "7px",
                      padding: "10px 12px",
                      fontFamily: "var(--font-mono)",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.6,
                    }}
                  >
                    {s.code}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" style={{ padding: "80px 0", backgroundColor: "#090909" }}>
        <div style={{ maxWidth: "1200px", marginInline: "auto", paddingInline: "24px" }}>
          <div style={{ marginBottom: "48px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#f59e0b",
              }}
            >
              Pricing
            </span>
            <h2
              style={{
                fontSize: "clamp(24px, 3.5vw, 38px)",
                fontWeight: 800,
                letterSpacing: "-0.025em",
                color: "#f0f0f0",
                marginTop: "12px",
              }}
            >
              Choose your monthly plan
            </h2>
            <p style={{ fontSize: "14px", color: "#555", marginTop: "8px" }}>
              Start with a free trial. Scale to the volume you need. Pay with crypto.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
            }}
          >
            {[
              {
                name: "Free Trial",
                desc: "Try before you commit",
                price: "0",
                models: null as string[] | null,
                features: [
                  "100 requests total",
                  "10M tokens included",
                  "Sonnet 4.6 access",
                  "Quick setup support",
                ],
                popular: false,
              },
              {
                name: "Premium",
                desc: "For daily heavy usage",
                price: "69",
                models: ["Codex 5.4", "Opus 4.6", "Sonnet 4.6"] as string[],
                features: [
                  "Unlimited token usage",
                  "3,000 requests / day",
                  "~90,000 requests / month",
                  "Claude Code optimized",
                  "Community support",
                ],
                popular: true,
              },
              {
                name: "Premium+",
                desc: "For power users and teams",
                price: "149",
                models: ["Codex 5.4", "Opus 4.6", "Sonnet 4.6"] as string[],
                features: [
                  "Unlimited token usage",
                  "6,000 requests / day",
                  "Unlimited monthly requests",
                  "Extended context support",
                  "Priority support",
                ],
                popular: false,
              },
              {
                name: "Custom",
                desc: "Enterprise-level access",
                price: "Custom",
                models: null as string[] | null,
                features: [
                  "No token limit",
                  "No request / day limit",
                  "All models included",
                  "Custom rate limits",
                  "Dedicated support",
                ],
                popular: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                style={{
                  backgroundColor: plan.popular ? "#141008" : "#111",
                  border: plan.popular ? "1px solid rgba(245,158,11,0.35)" : "1px solid #242424",
                  borderRadius: "12px",
                  padding: "28px",
                  position: "relative",
                  transition: "border-color 0.2s",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {plan.popular && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-11px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      backgroundColor: "#f59e0b",
                      color: "#060606",
                      fontSize: "10px",
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      padding: "3px 12px",
                      borderRadius: "999px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Most Popular
                  </div>
                )}
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#f0f0f0" }}>{plan.name}</h3>
                <p style={{ fontSize: "12px", color: "#777", marginTop: "4px", marginBottom: "16px" }}>{plan.desc}</p>
                <div style={{ marginBottom: "16px" }}>
                  {plan.price !== "Custom" ? (
                    <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
                      <span style={{ fontSize: "14px", color: "#888" }}>$</span>
                      <span style={{ fontSize: "40px", fontWeight: 900, color: "#f0f0f0", letterSpacing: "-0.04em" }}>
                        {plan.price}
                      </span>
                      <span style={{ fontSize: "12px", color: "#666" }}>/mo</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: "26px", fontWeight: 800, color: "#666" }}>Custom</span>
                  )}
                </div>
                {plan.models && (
                  <div style={{ marginBottom: "16px" }}>
                    <p style={{ fontSize: "10px", fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Models Included</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                      {plan.models.map((m) => (
                        <span
                          key={m}
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            padding: "3px 8px",
                            borderRadius: "4px",
                            backgroundColor: "rgba(245,158,11,0.08)",
                            border: "1px solid rgba(245,158,11,0.2)",
                            color: "#d4930a",
                          }}
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <ul style={{ listStyle: "none", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "9px", flex: 1 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: "#aaa" }}>
                      <Check size={13} color="#22c55e" style={{ flexShrink: 0, marginTop: "2px" }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.price === "Custom" ? "https://t.me/legit_is_back" : "/signup"}
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "10px",
                    borderRadius: "7px",
                    fontSize: "13px",
                    fontWeight: 700,
                    textDecoration: "none",
                    backgroundColor: plan.popular ? "#f59e0b" : "transparent",
                    color: plan.popular ? "#060606" : "#888",
                    border: plan.popular ? "none" : "1px solid #2a2a2a",
                    transition: "background-color 0.15s, border-color 0.15s",
                  }}
                >
                  {plan.price === "Custom" ? "Contact Sales" : "Activate Plan"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FAQSection />

      {/* ─── CTA strip ─── */}
      <section style={{ padding: "80px 0", backgroundColor: "#0d0d0d" }}>
        <div style={{ maxWidth: "1200px", marginInline: "auto", paddingInline: "24px" }}>
          <div
            style={{
              backgroundColor: "#f59e0b",
              borderRadius: "16px",
              padding: "56px 48px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "24px",
            }}
          >
            <h2
              style={{
                fontSize: "clamp(24px, 4vw, 42px)",
                fontWeight: 900,
                color: "#060606",
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
              }}
            >
              Ready to ship without hitting limits?
            </h2>
            <p style={{ fontSize: "16px", color: "rgba(0,0,0,0.6)", maxWidth: "400px" }}>
              Sign up, grab your API key from Docs, and paste it in Claude Code.
              Done in under 5 minutes.
            </p>
            <Link href="/signup" className="btn-dark">
              Get Started — It&apos;s Free →
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}