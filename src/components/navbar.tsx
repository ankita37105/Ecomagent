"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const navLinks = [
    { href: "/#what-we-do", label: "What We Do" },
    { href: "/#setup", label: "How It Works" },
    { href: "/#pricing", label: "Pricing" },
    { href: "/docs", label: "Docs" },
    { href: "/blog", label: "Blog" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: scrolled ? "#0d0d0d" : "transparent",
        borderBottom: scrolled ? "1px solid #1e1e1e" : "1px solid transparent",
        transition: "background-color 0.25s, border-color 0.25s",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          marginInline: "auto",
          paddingInline: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "60px",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            fontWeight: 700,
            fontSize: "15px",
            letterSpacing: "-0.01em",
            color: "#f0f0f0",
            textDecoration: "none",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "22px",
              height: "22px",
              borderRadius: "5px",
              backgroundColor: "#f59e0b",
              marginRight: "9px",
              flexShrink: 0,
            }}
          />
          ecomagent<span style={{ color: "#f59e0b" }}>.in</span>
        </Link>

        {/* Desktop nav */}
        <ul
          style={{
            display: "none",
            alignItems: "center",
            gap: "28px",
            listStyle: "none",
          }}
          className="md:flex"
        >
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                style={{
                  fontSize: "13.5px",
                  color: pathname === link.href ? "#f59e0b" : "#888888",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#f0f0f0")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color =
                    pathname === link.href ? "#f59e0b" : "#888888")
                }
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop CTA */}
        <div className="hidden md:flex" style={{ alignItems: "center", gap: "10px" }}>
          {user ? (
            <>
              <span style={{ fontSize: "12px", color: "#666" }}>{user.email}</span>
              <Link
                href="/dashboard"
                style={{
                  padding: "7px 16px",
                  fontSize: "13px",
                  fontWeight: 600,
                  borderRadius: "7px",
                  backgroundColor: "#f59e0b",
                  color: "#060606",
                  textDecoration: "none",
                  transition: "background-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#d97706")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f59e0b")}
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  padding: "7px 16px",
                  fontSize: "13px",
                  borderRadius: "7px",
                  border: "1px solid #2a2a2a",
                  backgroundColor: "transparent",
                  color: "#888",
                  cursor: "pointer",
                  transition: "border-color 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#3d3d3d";
                  e.currentTarget.style.color = "#f0f0f0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#2a2a2a";
                  e.currentTarget.style.color = "#888";
                }}
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                style={{
                  padding: "7px 16px",
                  fontSize: "13px",
                  color: "#888",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#f0f0f0")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#888")}
              >
                Log In
              </Link>
              <Link
                href="/signup"
                style={{
                  padding: "7px 18px",
                  fontSize: "13px",
                  fontWeight: 600,
                  borderRadius: "7px",
                  backgroundColor: "#f59e0b",
                  color: "#060606",
                  textDecoration: "none",
                  transition: "background-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#d97706")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f59e0b")}
              >
                Get Started →
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden"
          style={{ padding: "6px", color: "#888", background: "none", border: "none", cursor: "pointer" }}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div
          style={{
            backgroundColor: "#0d0d0d",
            borderTop: "1px solid #1e1e1e",
            padding: "16px 24px 20px",
          }}
          className="md:hidden"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: "block",
                  padding: "10px 0",
                  fontSize: "14px",
                  color: "#888",
                  textDecoration: "none",
                  borderBottom: "1px solid #1a1a1a",
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "10px",
                    fontSize: "14px",
                    fontWeight: 600,
                    borderRadius: "8px",
                    backgroundColor: "#f59e0b",
                    color: "#060606",
                    textDecoration: "none",
                  }}
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => { handleLogout(); setMobileOpen(false); }}
                  style={{
                    padding: "10px",
                    fontSize: "14px",
                    borderRadius: "8px",
                    border: "1px solid #2a2a2a",
                    backgroundColor: "transparent",
                    color: "#888",
                    cursor: "pointer",
                  }}
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "10px",
                    fontSize: "14px",
                    borderRadius: "8px",
                    border: "1px solid #2a2a2a",
                    color: "#888",
                    textDecoration: "none",
                  }}
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "10px",
                    fontSize: "14px",
                    fontWeight: 600,
                    borderRadius: "8px",
                    backgroundColor: "#f59e0b",
                    color: "#060606",
                    textDecoration: "none",
                  }}
                >
                  Get Started →
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
