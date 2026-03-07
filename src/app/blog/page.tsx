import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export const metadata: Metadata = {
  title: "Blog - Claude Code Tips & Guides",
  description:
    "Guides, tips, and tutorials for Claude Code workflows, API setup, troubleshooting, and coding best practices.",
};

const posts = [
  {
    slug: "claude-code-setup-windows-macos-linux",
    title: "Claude Code Setup: Windows, macOS & Linux",
    excerpt: "Complete step-by-step guide to set up Claude Code on any operating system.",
    tag: "Setup",
    date: "2026-02-15",
  },
  {
    slug: "api-key-safety-for-claude-code",
    title: "API Key Safety for Claude Code",
    excerpt: "Best practices for keeping your API keys secure in development workflows.",
    tag: "Security",
    date: "2026-02-12",
  },
  {
    slug: "choose-claude-plan-solo-vs-team",
    title: "Choosing a Claude Plan: Solo vs Team",
    excerpt: "How to pick the right EcomAgent plan based on your usage patterns.",
    tag: "Pricing",
    date: "2026-02-10",
  },
  {
    slug: "claude-opus-vs-sonnet-coding",
    title: "Claude Opus vs Sonnet for Coding",
    excerpt: "When to use Opus vs Sonnet 4.6 for different coding tasks.",
    tag: "Workflow",
    date: "2026-02-08",
  },
  {
    slug: "common-claude-code-errors-fixes",
    title: "Common Claude Code Errors & Fixes",
    excerpt: "Troubleshooting the most common errors when using Claude Code with custom endpoints.",
    tag: "Troubleshooting",
    date: "2026-02-05",
  },
  {
    slug: "long-coding-sessions-claude-workflow",
    title: "Long Coding Sessions with Claude",
    excerpt: "Tips for maintaining productive long coding sessions with Claude Code.",
    tag: "Workflow",
    date: "2026-02-02",
  },
  {
    slug: "free-claude-code-options",
    title: "Free Claude Code Options",
    excerpt: "What are your options for using Claude Code without paying? Here's a realistic overview.",
    tag: "Pricing",
    date: "2026-01-30",
  },
  {
    slug: "troubleshooting-rate-limits-claude-coding-tools",
    title: "Troubleshooting Rate Limits",
    excerpt: "How to handle and avoid rate limits when using Claude with coding tools.",
    tag: "Troubleshooting",
    date: "2026-01-28",
  },
  {
    slug: "unlimited-claude-access-guide",
    title: "Unlimited Claude Access Guide",
    excerpt: "Everything you need to know about getting unlimited Claude access through EcomAgent.",
    tag: "Setup",
    date: "2026-01-25",
  },
  {
    slug: "reduce-interruptions-in-long-prompt-sessions",
    title: "Reduce Interruptions in Long Sessions",
    excerpt: "Strategies to minimize interruptions during long prompt sessions.",
    tag: "Workflow",
    date: "2026-01-22",
  },
  {
    slug: "signup-to-first-api-call-checklist",
    title: "Signup to First API Call Checklist",
    excerpt: "Step-by-step checklist from account creation to your first successful API call.",
    tag: "Setup",
    date: "2026-01-20",
  },
  {
    slug: "connect-claude-code-custom-endpoint",
    title: "Connect Claude Code to Custom Endpoint",
    excerpt: "How to configure Claude Code to use the EcomAgent custom API endpoint.",
    tag: "Setup",
    date: "2026-01-18",
  },
  {
    slug: "free-api-key-myths-and-real-options",
    title: "Free API Key Myths & Real Options",
    excerpt: "Separating fact from fiction about free API keys for AI models.",
    tag: "Pricing",
    date: "2026-01-15",
  },
  {
    slug: "openrouter-vs-plan-based-claude-access",
    title: "OpenRouter vs Plan-Based Claude Access",
    excerpt: "Comparing OpenRouter pay-per-token vs EcomAgent plan-based unlimited access.",
    tag: "Pricing",
    date: "2026-01-12",
  },
  {
    slug: "huggingface-vs-direct-claude-endpoints",
    title: "HuggingFace vs Direct Claude Endpoints",
    excerpt: "Pros and cons of different ways to access Claude models.",
    tag: "Setup",
    date: "2026-01-10",
  },
];

const tagColors: Record<string, string> = {
  Setup: "bg-primary/10 text-primary border-primary/20",
  Security: "bg-danger/10 text-danger border-danger/20",
  Pricing: "bg-success/10 text-success border-success/20",
  Workflow: "bg-accent/10 text-accent border-accent/20",
  Troubleshooting: "bg-warning/10 text-warning border-warning/20",
};

export default function BlogPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-xs uppercase tracking-widest text-primary font-semibold">Blog</span>
            <h1 className="text-3xl sm:text-4xl font-bold mt-3 mb-4">
              Claude Code Tips & Guides
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Guides, tips, and tutorials for Claude Code workflows, API setup, and coding practices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="glass glass-hover rounded-xl p-6 transition-all duration-300 hover:translate-y-[-2px] group block"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2.5 py-0.5 text-xs rounded-full border ${tagColors[post.tag] || "bg-muted/10 text-muted"}`}>
                    {post.tag}
                  </span>
                  <span className="text-xs text-muted">{new Date(post.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                <h2 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {post.excerpt}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
