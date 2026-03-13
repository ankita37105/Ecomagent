"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Zap, LayoutDashboard, Key, BarChart3, CreditCard, FileText,
  LogOut, Copy, Check, Eye, EyeOff, RefreshCw, Plus, ExternalLink, LifeBuoy,
  Menu, X, Activity, Cpu, TrendingUp, Shield, ChevronRight, Users,
} from "lucide-react";

type ApiKeyData = { key: string; name: string; createdAt: string; userId: string };
type UsageLog = { timestamp: string; model: string; tokens: number; status: string };
type ModelUsage = { model: string; requests: number; tokens: number };
type UsageData  = {
  requests: number;
  tokens: number;
  lastUpdated: string;
  recentLogs: UsageLog[];
  modelBreakdown: ModelUsage[];
};
type PlanInfo   = { name: string; requestLimit: string; tokenLimit: string; planStartsAt?: string; planEndsAt?: string };

/* â”€â”€ small shared sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function StatCard({
  label, value, sub, accent, icon: Icon,
}: { label: string; value: string | number; sub?: string; accent: string; icon: React.ComponentType<{ style?: React.CSSProperties; size?: number }> }) {
  return (
    <div style={{
      background: "#111",
      border: "1px solid #222",
      borderRadius: 14,
      padding: "20px 22px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* dim circle bg */}
      <span style={{
        position: "absolute", top: "-14px", right: "-14px",
        width: 72, height: 72, borderRadius: "50%",
        background: accent, opacity: 0.06,
      }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {label}
        </p>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: `${accent}18`, display: "grid", placeItems: "center" }}>
          <Icon size={14} style={{ color: accent }} />
        </span>
      </div>
      <p style={{ fontSize: 26, fontWeight: 800, color: "#f0f0f0", letterSpacing: "-0.03em", lineHeight: 1 }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && <p style={{ fontSize: 11, color: "#555" }}>{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f0f0f0", letterSpacing: "-0.02em" }}>{title}</h2>
      {sub && <p style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

/* â”€â”€ main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [apiKey, setApiKey] = useState<ApiKeyData | null>(null);
  const [keyVisible, setKeyVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  const [usage, setUsage] = useState<UsageData>({
    requests: 0,
    tokens: 0,
    lastUpdated: "",
    recentLogs: [],
    modelBreakdown: [],
  });
  const [usageLoading, setUsageLoading] = useState(false);
  const [usagePage, setUsagePage] = useState(1);

  const [plan, setPlan] = useState<PlanInfo>({ name: "Free Trial", requestLimit: "100", tokenLimit: "10M", planStartsAt: undefined, planEndsAt: undefined });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.push("/login"); return; }
      setUser(session.user);
      setLoading(false);
      const saved = localStorage.getItem(`ecom_api_key_${session.user.id}`);
      if (saved) { try { setApiKey(JSON.parse(saved)); } catch { /* ignore */ } }
    });
  }, [router]);

  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;

    const syncSubscription = async () => {
      try {
        const res = await fetch(`/api/subscription/${encodeURIComponent(user.id as string)}`);
        const data = await res.json();
        const subscription = data?.subscription;

        if (!isMounted || !data?.success || !subscription) return;

        const planLabel =
          subscription.plan === "premium"
            ? "Premium"
            : subscription.plan === "premium+"
              ? "Premium+"
              : "Free Trial";

        setPlan({
          name: planLabel,
          requestLimit: subscription.requestLimit || "100",
          tokenLimit: subscription.tokenLimit || "10M",
          planStartsAt: subscription.planStartsAt ?? undefined,
          planEndsAt: subscription.planEndsAt ?? undefined,
        });

        if (subscription.apiKey) {
          const restoredKey: ApiKeyData = {
            key: subscription.apiKey,
            name: subscription.apiKeyName || "EcomAgent Trial",
            createdAt: subscription.updatedAt || new Date().toISOString(),
            userId: subscription.providerUserId || "",
          };
          setApiKey(restoredKey);
          localStorage.setItem(`ecom_api_key_${user.id}`, JSON.stringify(restoredKey));
        } else {
          setApiKey(null);
          localStorage.removeItem(`ecom_api_key_${user.id}`);
        }
      } catch {
        // ignore subscription sync errors in UI
      }
    };

    void syncSubscription();

    // Keep limits and plan updated after payment/IPN confirmations.
    const interval = window.setInterval(() => {
      void syncSubscription();
    }, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [user?.id]);

  const fetchUsage = async () => {
    if (!apiKey?.userId) return;
    setUsageLoading(true);
    try {
      const res = await fetch(`/api/sync-usage/${apiKey.userId}`);
      const data = await res.json();
      if (data.success) setUsage(data.usage);
    } catch {
      // ignore usage sync errors in UI
    }
    setUsageLoading(false);
  };

  useEffect(() => {
    if (!apiKey?.userId) return;

    let isMounted = true;

    const syncUsage = async () => {
      setUsageLoading(true);
      try {
        const res = await fetch(`/api/sync-usage/${apiKey.userId}`);
        const data = await res.json();
        if (isMounted && data.success) setUsage(data.usage);
      } catch {
        // ignore usage sync errors in UI
      }
      if (isMounted) setUsageLoading(false);
    };

    void syncUsage();

    const intervalId = window.setInterval(() => {
      void syncUsage();
    }, 10000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [apiKey?.userId]);

  const generateKey = async () => {
    if (!user?.id || !user?.email) {
      setGenError("Please sign in again to generate your key.");
      return;
    }

    setGenerating(true);
    setGenError("");
    try {
      const res = await fetch("/api/generate-key", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountId: user.id, email: user.email }),
      });
      const data = await res.json();
      if (data.success && data.key) {
        const newKey: ApiKeyData = { key: data.key, name: "EcomAgent Trial", createdAt: new Date().toISOString(), userId: data.userId || "" };
        setApiKey(newKey);
        if (user?.id) localStorage.setItem(`ecom_api_key_${user.id}`, JSON.stringify(newKey));
      } else {
        setGenError(data.error || "Failed to generate key");
      }
    } catch { setGenError("Network error. Please try again."); }
    setGenerating(false);
  };

  const copyKey = () => {
    if (!apiKey?.key) return;
    navigator.clipboard.writeText(apiKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/"); };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#090909" }}>
        <div style={{ width: 36, height: 36, border: "2px solid #f59e0b", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const sidebarItems = [
    { id: "overview",  icon: LayoutDashboard, label: "Overview"  },
    { id: "api-keys",  icon: Key,             label: "API Keys"  },
    { id: "usage",     icon: BarChart3,        label: "Usage"     },
    { id: "billing",   icon: CreditCard,       label: "Billing"   },
  ];

  const requestsUsed   = usage.requests;
  const requestLimit   = plan.requestLimit === "Unlimited" ? Infinity : parseInt(plan.requestLimit);
  const requestPercent = requestLimit === Infinity ? 0 : Math.min((requestsUsed / requestLimit) * 100, 100);
  const initials       = (user?.email ?? "U").slice(0, 2).toUpperCase();
  const isPaidPlan = plan.name === "Premium" || plan.name === "Premium+";

  const usagePageSize = 50;
  const usageTotalPages = 4;
  const cappedUsageLogs = usage.recentLogs.slice(0, usagePageSize * usageTotalPages);
  const safeUsagePage = Math.min(Math.max(usagePage, 1), usageTotalPages);
  const pagedUsageLogs = cappedUsageLogs.slice(
    (safeUsagePage - 1) * usagePageSize,
    safeUsagePage * usagePageSize
  );

  /* â”€â”€ render â”€â”€ */
  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#090909" }}>

      {/* â”€â”€ Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40 }}
        />
      )}

      {/* â”€â”€ Sidebar */}
      <aside style={{
        position: "fixed",
        top: 0, left: 0, bottom: 0,
        width: 220,
        background: "#0b0b0b",
        borderRight: "1px solid #1c1c1c",
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s",
      }}
        className="md:translate-x-0 md:relative md:transform-none"
      >
        {/* Logo */}
        <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <span style={{ width: 26, height: 26, background: "#f59e0b", borderRadius: 7, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Zap size={14} style={{ color: "#060606" }} />
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#f0f0f0", letterSpacing: "-0.01em" }}>
              ecomagent<span style={{ color: "#f59e0b" }}>.in</span>
            </span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", padding: 4 }} className="md:hidden">
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {sidebarItems.map(({ id, icon: Icon, label }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 9, border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 13, fontWeight: active ? 600 : 400,
                  background: active ? "rgba(245,158,11,0.1)" : "transparent",
                  color: active ? "#f59e0b" : "#666",
                  transition: "background 0.15s, color 0.15s",
                  textAlign: "left",
                  position: "relative",
                }}
              >
                {active && (
                  <span style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 18, background: "#f59e0b", borderRadius: "0 2px 2px 0" }} />
                )}
                <Icon size={15} />
                {label}
              </button>
            );
          })}

          <div style={{ marginTop: 8, paddingTop: 10, borderTop: "1px solid #1a1a1a" }}>
            <Link
              href="/docs"
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                borderRadius: 9, fontSize: 13, color: "#555", textDecoration: "none",
                transition: "color 0.15s",
              }}
            >
              <FileText size={15} />
              Documentation
              <ExternalLink size={11} style={{ marginLeft: "auto" }} />
            </Link>
            <a
              href="https://t.me/Calude_Max_5X_20x_Code_Pro_AI"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                borderRadius: 9, fontSize: 13, color: "#555", textDecoration: "none",
                transition: "color 0.15s",
              }}
            >
              <Users size={15} />
              Community
              <ExternalLink size={11} style={{ marginLeft: "auto" }} />
            </a>
            <a
              href="https://t.me/legit_is_back"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                borderRadius: 9, fontSize: 13, color: "#555", textDecoration: "none",
                transition: "color 0.15s",
              }}
            >
              <LifeBuoy size={15} />
              Support
              <ExternalLink size={11} style={{ marginLeft: "auto" }} />
            </a>
          </div>
        </nav>

        {/* User area */}
        <div style={{ padding: "12px 10px", borderTop: "1px solid #1a1a1a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 4 }}>
            <span style={{
              width: 30, height: 30, borderRadius: "50%", background: "rgba(245,158,11,0.15)",
              border: "1px solid rgba(245,158,11,0.25)", display: "grid", placeItems: "center",
              fontSize: 11, fontWeight: 700, color: "#f59e0b", flexShrink: 0,
            }}>
              {initials}
            </span>
            <span style={{ fontSize: 12, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.email}
            </span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "8px 12px", borderRadius: 9, border: "none", cursor: "pointer",
              background: "transparent", fontFamily: "inherit", fontSize: 13, color: "#555",
              transition: "color 0.15s, background 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.06)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#555"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            <LogOut size={14} />
            Log Out
          </button>
        </div>
      </aside>

      {/* â”€â”€ Main */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh", overflow: "auto" }}
        className="md:ml-0"
      >
        {isPaidPlan && (
          <div style={{
            position: "fixed",
            right: 16,
            bottom: 16,
            zIndex: 60,
            width: 310,
            background: "linear-gradient(145deg,#161616 0%, #1d1508 100%)",
            border: "1px solid rgba(245,158,11,0.35)",
            borderRadius: 14,
            padding: "14px 14px 12px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.45)",
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>
              Premium Activated
            </p>
            <p style={{ fontSize: 12, color: "#b8b8b8", lineHeight: 1.45, marginBottom: 10 }}>
              Contact Support for full premium features unlock.
            </p>
            <a
              href="https://t.me/legit_is_back"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                width: "100%",
                padding: "9px 11px",
                borderRadius: 9,
                background: "#f59e0b",
                color: "#060606",
                textDecoration: "none",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Contact Support
            </a>
          </div>
        )}

        {/* Topbar */}
        <header style={{
          position: "sticky", top: 0, zIndex: 40,
          background: "rgba(9,9,9,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #1c1c1c",
          padding: "0 24px",
          height: 56,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#555", padding: 4, display: "none" }}
              className="md:hidden"
            >
              <Menu size={18} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#555" }}>
              <span>Dashboard</span>
              <ChevronRight size={13} />
              <span style={{ color: "#f0f0f0", fontWeight: 600, textTransform: "capitalize" }}>
                {activeTab.replace("-", " ")}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
              background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)",
              color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.07em",
            }}>
              {plan.name}
            </span>
          </div>
        </header>

        {/* Page content */}
        <div style={{ padding: "28px 24px", maxWidth: 860, width: "100%" }}>

          {/* â”€â”€ OVERVIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeTab === "overview" && (
            <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                <StatCard label="Current Plan"    value={plan.name}                  accent="#f59e0b" icon={Shield}     sub="Your active tier" />
                <StatCard label="Requests Used"   value={requestsUsed}               accent="#f59e0b" icon={Activity}
                  sub={`${requestsUsed.toLocaleString()} / ${plan.requestLimit}`} />
                <StatCard label="Tokens Used"     value={usage.tokens.toLocaleString()} accent="#22c55e" icon={Cpu}
                  sub={`Limit: ${plan.tokenLimit}`} />
              </div>

              {/* Request progress */}
              <div style={{ background: "#111", border: "1px solid #222", borderRadius: 14, padding: "18px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#aaa" }}>Request quota</p>
                  <p style={{ fontSize: 12, color: "#555" }}>{requestsUsed} / {plan.requestLimit}</p>
                </div>
                <div style={{ height: 6, background: "#1e1e1e", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${requestPercent}%`, background: "linear-gradient(90deg,#d97706,#f59e0b)", borderRadius: 99, transition: "width 0.5s" }} />
                </div>
                <p style={{ fontSize: 11, color: "#444", marginTop: 8 }}>{requestPercent.toFixed(0)}% of your daily allowance used</p>
              </div>

              {/* API key CTA or Display */}
              {!apiKey ? (
                <div style={{
                  background: "linear-gradient(135deg, #111 0%, #141008 100%)",
                  border: "1px solid rgba(245,158,11,0.15)",
                  borderRadius: 14, padding: "36px 28px", textAlign: "center",
                }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
                    <Key size={20} style={{ color: "#f59e0b" }} />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f0f0f0", marginBottom: 6 }}>Get your API key</h3>
                  <p style={{ fontSize: 13, color: "#666", marginBottom: 20, maxWidth: 320, margin: "0 auto 20px" }}>
                    Generate a free trial key and start making requests in under 2 minutes.
                  </p>
                  <button
                    onClick={generateKey}
                    disabled={generating}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px",
                      borderRadius: 9, background: "#f59e0b", border: "none", cursor: generating ? "not-allowed" : "pointer",
                      color: "#060606", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                      opacity: generating ? 0.6 : 1, transition: "opacity 0.15s, background 0.15s",
                    }}
                  >
                    {generating ? <RefreshCw size={14} style={{ animation: "spin 0.7s linear infinite" }} /> : <Plus size={14} />}
                    {generating ? "Generatingâ€¦" : "+ Get Free Trial Key"}
                  </button>
                  {genError && (
                    <p style={{ fontSize: 12, color: "#ef4444", marginTop: 12, background: "rgba(239,68,68,0.08)", padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)", display: "inline-block" }}>
                      {genError}
                    </p>
                  )}
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : (
                <div style={{ background: "#0d0d0d", border: "1px solid #222", borderRadius: 14, overflow: "hidden" }}>
                  {/* Key header */}
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "block" }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#888" }}>Active API Key â€” {apiKey.name}</span>
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "#444" }}>
                      Created {new Date(apiKey.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {/* Key value */}
                  <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 10, background: "#080808" }}>
                    <code style={{ flex: 1, fontFamily: "var(--font-mono), monospace", fontSize: 13, color: "#a3e635", letterSpacing: "0.04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {keyVisible ? apiKey.key : apiKey.key.slice(0, 16) + "  â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ"}
                    </code>
                    <button onClick={() => setKeyVisible(!keyVisible)} title={keyVisible ? "Hide" : "Reveal"}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#444", padding: 6, borderRadius: 6, transition: "color 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#f0f0f0")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#444")}
                    >
                      {keyVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button onClick={copyKey} title="Copy"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px",
                        borderRadius: 7, border: "1px solid #2a2a2a", background: copied ? "rgba(34,197,94,0.1)" : "#111",
                        cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                        color: copied ? "#22c55e" : "#888", transition: "all 0.15s",
                      }}
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              {/* Quick setup */}
              <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "12px 18px", borderBottom: "1px solid #1a1a1a", background: "#111", display: "flex", alignItems: "center", gap: 8 }}>
                  <TrendingUp size={13} style={{ color: "#f59e0b" }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#888" }}>Quick Setup â€” settings.json</span>
                </div>
                <pre style={{ padding: "18px 20px", fontFamily: "var(--font-mono), monospace", fontSize: 12, lineHeight: 1.8, color: "#555", overflowX: "auto" }}>
                  <code>{`{
  `}<span style={{ color: "#93c5fd" }}>&quot;env&quot;</span>{`: {
    `}<span style={{ color: "#93c5fd" }}>&quot;ANTHROPIC_BASE_URL&quot;</span>{`: `}<span style={{ color: "#a3e635" }}>&quot;https://api.ecomagent.in/&quot;</span>{`,
    `}<span style={{ color: "#93c5fd" }}>&quot;ANTHROPIC_AUTH_TOKEN&quot;</span>{`: `}<span style={{ color: "#a3e635" }}>&quot;{apiKey?.key || "YOUR_API_KEY"}&quot;</span>{`
  }
}`}</code>
                </pre>
              </div>

            </div>
          )}

          {/* â”€â”€ API KEYS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeTab === "api-keys" && (
            <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <SectionHeader title="API Keys" sub="Manage your EcomAgent access keys." />
                {!apiKey && (
                  <button
                    onClick={generateKey}
                    disabled={generating}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                      background: "#f59e0b", color: "#060606", fontSize: 12, fontWeight: 700,
                      fontFamily: "inherit", opacity: generating ? 0.6 : 1,
                    }}
                  >
                    {generating ? <RefreshCw size={13} style={{ animation: "spin 0.7s linear infinite" }} /> : <Plus size={13} />}
                    + Generate Key
                  </button>
                )}
              </div>

              {genError && (
                <div style={{ fontSize: 13, color: "#ef4444", background: "rgba(239,68,68,0.08)", padding: "10px 16px", borderRadius: 9, border: "1px solid rgba(239,68,68,0.2)" }}>
                  {genError}
                </div>
              )}

              {apiKey ? (
                <div style={{ background: "#0d0d0d", border: "1px solid #222", borderRadius: 14, overflow: "hidden" }}>
                  {/* Header bar */}
                  <div style={{ padding: "14px 20px", background: "#111", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Key size={14} style={{ color: "#f59e0b" }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#f0f0f0" }}>{apiKey.name}</span>
                    </div>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "#22c55e", background: "rgba(34,197,94,0.1)", padding: "3px 10px", borderRadius: 999, border: "1px solid rgba(34,197,94,0.2)" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                      Active
                    </span>
                  </div>
                  {/* Key row */}
                  <div style={{ padding: "14px 20px", background: "#080808", display: "flex", alignItems: "center", gap: 10 }}>
                    <code style={{ flex: 1, fontFamily: "var(--font-mono), monospace", fontSize: 12, color: "#a3e635", letterSpacing: "0.04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {keyVisible ? apiKey.key : apiKey.key.slice(0, 16) + "  â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ"}
                    </code>
                    <button onClick={() => setKeyVisible(!keyVisible)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#555", padding: 5 }}>
                      {keyVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button onClick={copyKey}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px",
                        borderRadius: 7, border: "1px solid #2a2a2a", background: copied ? "rgba(34,197,94,0.1)" : "#161616",
                        cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                        color: copied ? "#22c55e" : "#888",
                      }}
                    >
                      {copied ? <Check size={11} /> : <Copy size={11} />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  {/* Meta */}
                  <div style={{ padding: "12px 20px", borderTop: "1px solid #1a1a1a", display: "flex", gap: 24, flexWrap: "wrap" }}>
                    <div>
                      <p style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Created</p>
                      <p style={{ fontSize: 12, color: "#888" }}>{new Date(apiKey.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Endpoint</p>
                      <code style={{ fontSize: 12, color: "#93c5fd", fontFamily: "var(--font-mono), monospace" }}>https://api.ecomagent.in/v1</code>
                    </div>
                  </div>

                  {/* Usage example */}
                  <div style={{ borderTop: "1px solid #1a1a1a" }}>
                    <div style={{ padding: "12px 18px", background: "#0f0f0f", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "#555", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>cURL Example</span>
                    </div>
                    <pre style={{ padding: "14px 18px", fontFamily: "var(--font-mono), monospace", fontSize: 11, lineHeight: 1.75, color: "#666", overflowX: "auto", background: "#070707" }}>
{`curl https://api.ecomagent.in/v1/chat/completions \\
  -H "Authorization: Bearer ${apiKey.key.slice(0, 12)}..." \\
  -H "Content-Type: application/json" \\
  -d '{"model":"claude-sonnet-4-20250514","messages":[{"role":"user","content":"Hello"}]}'`}
                    </pre>
                  </div>
                </div>
              ) : (
                <div style={{
                  background: "linear-gradient(135deg,#111 0%,#141008 100%)",
                  border: "1px solid rgba(245,158,11,0.12)", borderRadius: 14,
                  padding: "48px 28px", textAlign: "center",
                }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
                    <Key size={22} style={{ color: "#f59e0b" }} />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f0f0f0", marginBottom: 8 }}>No API keys yet</h3>
                  <p style={{ fontSize: 13, color: "#555", marginBottom: 22 }}>Generate your first key to start calling the API.</p>
                  <button
                    onClick={generateKey}
                    disabled={generating}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px",
                      borderRadius: 9, background: "#f59e0b", border: "none", cursor: "pointer",
                      color: "#060606", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                    }}
                  >
                    {generating ? <RefreshCw size={14} style={{ animation: "spin 0.7s linear infinite" }} /> : <Plus size={14} />}
                    {generating ? "Generatingâ€¦" : "+ Generate Free Trial Key"}
                  </button>
                </div>
              )}
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* â”€â”€ USAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeTab === "usage" && (
            <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <SectionHeader title="Usage" sub="Real-time API usage from the provider." />
                <button
                  onClick={fetchUsage}
                  disabled={usageLoading}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px",
                    borderRadius: 8, border: "1px solid #222", background: "#111",
                    cursor: usageLoading ? "not-allowed" : "pointer",
                    fontSize: 12, color: "#666", fontFamily: "inherit",
                  }}
                >
                  <RefreshCw size={13} style={{ animation: usageLoading ? "spin 0.7s linear infinite" : "none" }} />
                  Sync usage
                </button>
              </div>

              {/* Big metric cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <div style={{ background: "#111", border: "1px solid #222", borderLeft: "3px solid #f59e0b", borderRadius: 14, padding: "20px 22px" }}>
                  <p style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontWeight: 600 }}>Total Requests</p>
                  <p style={{ fontSize: 34, fontWeight: 800, color: "#f0f0f0", letterSpacing: "-0.04em", lineHeight: 1 }}>{requestsUsed.toLocaleString()}</p>
                  <div style={{ marginTop: 14, height: 5, background: "#1e1e1e", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${requestPercent}%`, background: "linear-gradient(90deg,#d97706,#f59e0b)", borderRadius: 99 }} />
                  </div>
                  <p style={{ fontSize: 11, color: "#555", marginTop: 7 }}>{requestsUsed} / {plan.requestLimit} allowance used</p>
                </div>

                <div style={{ background: "#111", border: "1px solid #222", borderLeft: "3px solid #22c55e", borderRadius: 14, padding: "20px 22px" }}>
                  <p style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontWeight: 600 }}>Total Tokens</p>
                  <p style={{ fontSize: 34, fontWeight: 800, color: "#f0f0f0", letterSpacing: "-0.04em", lineHeight: 1 }}>{usage.tokens.toLocaleString()}</p>
                  <p style={{ fontSize: 11, color: "#555", marginTop: 20 }}>Limit: {plan.tokenLimit}</p>
                </div>
              </div>

              {/* Plan detail grid */}
              <div style={{ background: "#111", border: "1px solid #222", borderRadius: 14, padding: "18px 22px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Plan Details</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 20 }}>
                  {[
                    { label: "Plan",           value: plan.name          },
                    { label: "Request Limit",  value: plan.requestLimit  },
                    { label: "Token Limit",    value: plan.tokenLimit    },
                    { label: "Last Synced",    value: usage.lastUpdated ? new Date(usage.lastUpdated).toLocaleTimeString() : "â€”" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p style={{ fontSize: 11, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>{label}</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#ccc" }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Model-wise consumption */}
              <div style={{ background: "#111", border: "1px solid #222", borderRadius: 14, padding: "18px 22px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
                  Model-wise Consumption
                </p>

                {usage.modelBreakdown.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#666" }}>No model usage data yet.</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                    {usage.modelBreakdown.slice(0, 6).map((model) => (
                      <div key={model.model} style={{ background: "#0d0d0d", border: "1px solid #1d1d1d", borderRadius: 10, padding: "12px 14px" }}>
                        <p style={{ fontSize: 12, color: "#8bb9ff", marginBottom: 8, fontWeight: 600 }}>
                          {model.model}
                        </p>
                        <p style={{ fontSize: 18, color: "#f0f0f0", fontWeight: 700, lineHeight: 1.1 }}>
                          {model.tokens.toLocaleString()}
                        </p>
                        <p style={{ fontSize: 11, color: "#666", marginTop: 6 }}>
                          tokens • {model.requests} requests
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent usage logs */}
              <div style={{ background: "#111", border: "1px solid #222", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Recent Usage Logs
                  </p>
                  <p style={{ fontSize: 11, color: "#555" }}>{cappedUsageLogs.length} / 200 rows</p>
                </div>

                {cappedUsageLogs.length === 0 ? (
                  <div style={{ padding: "16px 18px", fontSize: 12, color: "#666" }}>No logs available yet.</div>
                ) : (
                  <div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #1a1a1a", background: "#0c0c0c" }}>
                            <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, color: "#555", fontWeight: 700 }}>Timestamp</th>
                            <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, color: "#555", fontWeight: 700 }}>Model</th>
                            <th style={{ textAlign: "right", padding: "10px 14px", fontSize: 11, color: "#555", fontWeight: 700 }}>Tokens</th>
                            <th style={{ textAlign: "right", padding: "10px 14px", fontSize: 11, color: "#555", fontWeight: 700 }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagedUsageLogs.map((log, index) => (
                            <tr key={`${log.timestamp}-${safeUsagePage}-${index}`} style={{ borderBottom: "1px solid #171717" }}>
                              <td style={{ padding: "10px 14px", fontSize: 12, color: "#bbb" }}>{log.timestamp}</td>
                              <td style={{ padding: "10px 14px" }}>
                                <span style={{ fontSize: 12, color: "#8bb9ff", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, padding: "3px 8px" }}>
                                  {log.model}
                                </span>
                              </td>
                              <td style={{ padding: "10px 14px", fontSize: 12, color: "#ddd", textAlign: "right" }}>
                                {log.tokens.toLocaleString()}
                              </td>
                              <td style={{ padding: "10px 14px", textAlign: "right" }}>
                                <span style={{ fontSize: 11, color: "#22c55e", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, padding: "3px 8px" }}>
                                  {log.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ padding: "12px 14px", borderTop: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <p style={{ fontSize: 11, color: "#666" }}>
                        Page {safeUsagePage} / {usageTotalPages} • 50 logs per page
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          onClick={() => setUsagePage((p) => Math.max(1, p - 1))}
                          disabled={safeUsagePage === 1}
                          style={{
                            border: "1px solid #2a2a2a",
                            background: "#121212",
                            color: safeUsagePage === 1 ? "#444" : "#aaa",
                            borderRadius: 7,
                            padding: "5px 9px",
                            fontSize: 11,
                            cursor: safeUsagePage === 1 ? "not-allowed" : "pointer",
                          }}
                        >
                          Prev
                        </button>

                        {[1, 2, 3, 4].map((pageNum) => (
                          <button
                            key={pageNum}
                            onClick={() => setUsagePage(pageNum)}
                            style={{
                              border: pageNum === safeUsagePage ? "1px solid rgba(245,158,11,0.35)" : "1px solid #2a2a2a",
                              background: pageNum === safeUsagePage ? "rgba(245,158,11,0.16)" : "#121212",
                              color: pageNum === safeUsagePage ? "#f59e0b" : "#aaa",
                              borderRadius: 7,
                              padding: "5px 9px",
                              fontSize: 11,
                              minWidth: 30,
                              cursor: "pointer",
                            }}
                          >
                            {pageNum}
                          </button>
                        ))}

                        <button
                          onClick={() => setUsagePage((p) => Math.min(usageTotalPages, p + 1))}
                          disabled={safeUsagePage === usageTotalPages}
                          style={{
                            border: "1px solid #2a2a2a",
                            background: "#121212",
                            color: safeUsagePage === usageTotalPages ? "#444" : "#aaa",
                            borderRadius: 7,
                            padding: "5px 9px",
                            fontSize: 11,
                            cursor: safeUsagePage === usageTotalPages ? "not-allowed" : "pointer",
                          }}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {!apiKey && (
                <div style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 12, padding: "14px 18px", fontSize: 13, color: "#888" }}>
                  âš  Generate an API key first â€” usage is tracked per key.
                </div>
              )}
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* â”€â”€ BILLING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeTab === "billing" && (
            <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <SectionHeader title="Billing" sub="Upgrade your plan with crypto payments." />

              {/* Current plan card */}
              {(() => {
                const now = new Date();
                const endsAt = plan.planEndsAt ? new Date(plan.planEndsAt) : null;
                const expired = endsAt ? endsAt < now : false;
                const daysLeft = endsAt ? Math.ceil((endsAt.getTime() - now.getTime()) / 86400000) : null;
                const urgent = daysLeft !== null && !expired && daysLeft <= 5;
                return (
                  <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 14, padding: "18px 22px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <p style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em" }}>Current Plan</p>
                      <p style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b" }}>{plan.name}</p>
                      <p style={{ fontSize: 12, color: "#555" }}>{plan.requestLimit} requests · {plan.tokenLimit} tokens</p>
                      {plan.planStartsAt && (
                        <p style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                          Started:{" "}
                          <span style={{ color: "#999" }}>
                            {new Date(plan.planStartsAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </p>
                      )}
                      {endsAt && (
                        <p style={{ fontSize: 12, marginTop: 2 }}>
                          <span style={{ color: "#555" }}>Expires: </span>
                          <span style={{ color: expired ? "#ef4444" : urgent ? "#f97316" : "#22c55e", fontWeight: 600 }}>
                            {endsAt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          <span style={{ marginLeft: 6, fontSize: 11, color: expired ? "#ef4444" : urgent ? "#f97316" : "#666" }}>
                            {expired ? "(expired)" : `(${daysLeft}d left)`}
                          </span>
                        </p>
                      )}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 999, background: expired ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", border: `1px solid ${expired ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}`, color: expired ? "#ef4444" : "#22c55e", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                      {expired ? "Expired" : "Active"}
                    </span>
                  </div>
                );
              })()}

              {/* Upgrade plans */}
              <p style={{ fontSize: 12, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em" }}>Upgrade with Crypto</p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                {[
                  {
                    name: "Premium", price: "$69", period: "/mo",
                    highlight: true,
                    features: ["Unlimited token usage", "3,000 req / day", "~90k req / month", "Codex 5.4 + Opus 4.6 + Sonnet 4.6", "Claude Code optimized"],
                  },
                  {
                    name: "Premium+", price: "$149", period: "/mo",
                    highlight: false,
                    features: ["Unlimited token usage", "6,000 req / day", "Unlimited monthly", "Codex 5.4 + Opus 4.6 + Sonnet 4.6", "Priority support"],
                  },
                  {
                    name: "Custom", price: "Contact", period: "",
                    highlight: false,
                    features: ["No token limit", "No request limit", "All models included", "Custom rate limits", "Dedicated support"],
                  },
                ].map((p) => (
                  <div
                    key={p.name}
                    style={{
                      background: p.highlight ? "linear-gradient(160deg,#141008 0%,#111 100%)" : "#111",
                      border: p.highlight ? "1px solid rgba(245,158,11,0.3)" : "1px solid #222",
                      borderRadius: 14, padding: "22px 20px",
                      display: "flex", flexDirection: "column", gap: 14,
                      position: "relative",
                    }}
                  >
                    {p.highlight && (
                      <span style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: "#f59e0b", color: "#060606", fontSize: 9, fontWeight: 800, padding: "3px 10px", borderRadius: 999, letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                        Most Popular
                      </span>
                    )}
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#f0f0f0", marginBottom: 6 }}>{p.name}</p>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                        {p.period ? (
                          <>
                            <span style={{ fontSize: 28, fontWeight: 800, color: "#f59e0b", letterSpacing: "-0.04em" }}>{p.price}</span>
                            <span style={{ fontSize: 12, color: "#555" }}>{p.period}</span>
                          </>
                        ) : (
                          <span style={{ fontSize: 18, fontWeight: 700, color: "#555" }}>{p.price}</span>
                        )}
                      </div>
                    </div>

                    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                      {p.features.map((f) => (
                        <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "#999" }}>
                          <Check size={11} style={{ color: "#22c55e", flexShrink: 0, marginTop: 1 }} />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {p.name !== "Custom" ? (
                      <form action="/api/payment/create" method="POST" style={{ marginTop: "auto" }}>
                        <input type="hidden" name="plan" value={p.name.toLowerCase()} />
                        <input type="hidden" name="email" value={user?.email || ""} />
                        <input type="hidden" name="accountId" value={user?.id || ""} />
                        <label style={{ display: "block", marginBottom: 8 }}>
                          <span style={{ fontSize: 11, color: "#777", display: "block", marginBottom: 5 }}>
                            Select crypto network
                          </span>
                          <select
                            name="currency"
                            defaultValue="usdt_trc20"
                            style={{
                              width: "100%",
                              padding: "9px 10px",
                              borderRadius: 8,
                              border: "1px solid #2a2a2a",
                              background: "#0e0e0e",
                              color: "#ddd",
                              fontSize: 12,
                              marginBottom: 10,
                            }}
                          >
                            <option value="usdt_trc20">USDT TRC20</option>
                            <option value="eth_erc20">ETH ERC20</option>
                            <option value="litecoin">Litecoin</option>
                            <option value="bitcoin">Bitcoin</option>
                          </select>
                        </label>
                        <button
                          type="submit"
                          style={{
                            width: "100%", padding: "10px", borderRadius: 9, border: "none", cursor: "pointer",
                            background: p.highlight ? "#f59e0b" : "#1a1a1a",
                            color: p.highlight ? "#060606" : "#aaa",
                            fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                            transition: "background 0.15s",
                          }}
                        >
                          Pay with Crypto
                        </button>
                      </form>
                    ) : (
                      <a
                        href="https://t.me/legit_is_back"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "block", textAlign: "center", padding: "10px",
                          borderRadius: 9, border: "1px solid #2a2a2a", background: "transparent",
                          fontSize: 12, color: "#666", textDecoration: "none",
                          transition: "border-color 0.15s, color 0.15s", marginTop: "auto",
                        }}
                      >
                        Contact Sales â†’
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 768px) {
          aside { position: relative !important; transform: translateX(0) !important; }
        }
      `}</style>
    </div>
  );
}

