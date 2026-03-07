"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "What exactly are you selling?",
    a: "We provide API access to Claude Opus and Sonnet 4.6 with plan-based request limits and unlimited token usage on paid plans.",
  },
  {
    q: "Can I use this directly in Claude Code?",
    a: "Yes. Open your Claude Code settings.json, paste your endpoint and API key, and continue using Claude Code normally.",
  },
  {
    q: "Where can I read the full Claude Code setup documentation?",
    a: "Use the public Docs page — it is open without login from the top navigation.",
  },
  {
    q: "Do you provide a free API key option?",
    a: "You can start with our Free Trial plan to test the endpoint and workflow. Paid plans add higher request limits and unlimited token usage.",
  },
];

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section
      id="faq"
      style={{ padding: "80px 0", backgroundColor: "#090909" }}
    >
      <div style={{ maxWidth: "720px", marginInline: "auto", paddingInline: "24px" }}>
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
            FAQ
          </span>
          <h2
            style={{
              fontSize: "clamp(24px, 3.5vw, 36px)",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              color: "#f0f0f0",
              marginTop: "12px",
            }}
          >
            Common questions
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {faqs.map((faq, i) => (
            <div
              key={i}
              style={{
                backgroundColor: "#111",
                border: "1px solid #1e1e1e",
                borderRadius: "10px",
                overflow: "hidden",
                transition: "border-color 0.2s",
              }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "18px 20px",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#f0f0f0",
                }}
              >
                <span style={{ fontSize: "14px", fontWeight: 600 }}>{faq.q}</span>
                <ChevronDown
                  size={16}
                  color="#555"
                  style={{
                    transform: open === i ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                    flexShrink: 0,
                    marginLeft: "16px",
                  }}
                />
              </button>
              {open === i && (
                <div style={{ padding: "0 20px 18px" }}>
                  <p style={{ fontSize: "13.5px", color: "#666", lineHeight: 1.65 }}>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
