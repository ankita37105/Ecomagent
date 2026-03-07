import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { ArrowLeft } from "lucide-react";

// Blog post content stored as a record
const blogPosts: Record<string, { title: string; description: string; tag: string; date: string; content: string }> = {
  "claude-code-setup-windows-macos-linux": {
    title: "Claude Code Setup: Windows, macOS & Linux",
    description: "Complete step-by-step guide to set up Claude Code on any operating system with EcomAgent API.",
    tag: "Setup",
    date: "2026-02-15",
    content: `
## Prerequisites
- Claude Code CLI installed
- An EcomAgent account (free trial available)
- A generated API key from your dashboard

## Windows Setup
1. Open PowerShell or Command Prompt
2. Navigate to your Claude Code config:
\`\`\`
notepad %USERPROFILE%\\.claude\\settings.json
\`\`\`
3. Add your EcomAgent configuration:
\`\`\`json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.ecomagent.in/",
    "ANTHROPIC_AUTH_TOKEN": "YOUR_API_KEY"
  }
}
\`\`\`

## macOS Setup
1. Open Terminal
2. Edit the config file:
\`\`\`bash
nano ~/.claude/settings.json
\`\`\`
3. Paste the same JSON configuration as above.

## Linux Setup
Same as macOS — use your preferred text editor to edit \`~/.claude/settings.json\`.

## Verify It Works
Run a quick test:
\`\`\`bash
claude "Say hello"
\`\`\`
If Claude responds, your setup is complete!
    `,
  },
  "api-key-safety-for-claude-code": {
    title: "API Key Safety for Claude Code",
    description: "Best practices for keeping your API keys secure in development workflows.",
    tag: "Security",
    date: "2026-02-12",
    content: `
## Never Commit Keys to Git
Always use environment variables or \`.env\` files. Add \`.env\` and \`.env.local\` to your \`.gitignore\`.

## Use Environment Variables
Instead of hardcoding keys:
\`\`\`bash
export ANTHROPIC_AUTH_TOKEN="your-key-here"
\`\`\`

## Rotate Keys Regularly
If you suspect a key has been exposed, generate a new one from your dashboard immediately.

## Limit Key Permissions
Use the key limits provided by EcomAgent to restrict request volume and prevent unexpected charges.
    `,
  },
  "choose-claude-plan-solo-vs-team": {
    title: "Choosing a Claude Plan: Solo vs Team",
    description: "How to pick the right EcomAgent plan based on your usage patterns and team size.",
    tag: "Pricing",
    date: "2026-02-10",
    content: `
## Solo Developer
If you're working alone, the **Premium** plan at $69/mo gives you 3k requests per day with unlimited tokens. That's enough for most individual workflows.

## Small Team (2-5 people)
The **Premium+** plan at $149/mo with 6k daily requests works for small teams sharing a single endpoint.

## Enterprise
For larger teams or heavy automation, contact us for a **Custom** plan with no limits.

## Start with the Free Trial
Not sure yet? The free trial gives you 100 requests to test everything before committing.
    `,
  },
  "claude-opus-vs-sonnet-coding": {
    title: "Claude Opus vs Sonnet for Coding",
    description: "When to use Claude Opus vs Sonnet 4.6 for different coding tasks.",
    tag: "Workflow",
    date: "2026-02-08",
    content: `
## Claude Opus
Best for complex, multi-step reasoning tasks. Use Opus when you need deep analysis, architecture decisions, or debugging complex bugs.

## Claude Sonnet 4.6
Faster and more efficient for everyday coding. Use Sonnet for code generation, quick fixes, and standard development tasks.

## Our Recommendation
Use Sonnet as your default model and switch to Opus when you hit a particularly complex problem. Both are available through EcomAgent.
    `,
  },
  "common-claude-code-errors-fixes": {
    title: "Common Claude Code Errors & Fixes",
    description: "Troubleshooting the most common errors when using Claude Code with custom endpoints.",
    tag: "Troubleshooting",
    date: "2026-02-05",
    content: `
## "Authentication Failed"
Double-check your API key in settings.json. Make sure there are no extra spaces or quotes.

## "Connection Refused"
Verify the ANTHROPIC_BASE_URL is correct: \`https://api.ecomagent.in/\`

## "Rate Limited"
You've hit your plan's request limit. Upgrade your plan or wait for the limit to reset.

## "Model Not Found"
Make sure you're using a supported model name like \`claude-sonnet-4-20250514\`.
    `,
  },
  "long-coding-sessions-claude-workflow": {
    title: "Long Coding Sessions with Claude",
    description: "Tips for maintaining productive long coding sessions with Claude Code.",
    tag: "Workflow",
    date: "2026-02-02",
    content: `
## Break Tasks Into Steps
Instead of one massive prompt, break your work into smaller, focused requests.

## Use Context Wisely
Claude Code maintains context within a session. Reference previous responses to build on them.

## Save Progress
Commit your code regularly so you don't lose work if a session is interrupted.

## Unlimited Tokens Help
With EcomAgent's paid plans, you get unlimited tokens — so long sessions don't burn through a budget.
    `,
  },
  "free-claude-code-options": {
    title: "Free Claude Code Options",
    description: "What are your options for using Claude Code without paying?",
    tag: "Pricing",
    date: "2026-01-30",
    content: `
## EcomAgent Free Trial
We offer 100 free requests with 10M tokens. This is the easiest way to test Claude Code with a custom endpoint.

## Anthropic Free Tier
Anthropic provides limited free credits for direct API access, but these run out quickly during active development.

## Our Recommendation
Start with the free trial, and if Claude Code works for your workflow, upgrade to Premium for $69/mo with unlimited tokens.
    `,
  },
  "troubleshooting-rate-limits-claude-coding-tools": {
    title: "Troubleshooting Rate Limits",
    description: "How to handle and avoid rate limits when using Claude with coding tools.",
    tag: "Troubleshooting",
    date: "2026-01-28",
    content: `
## Understanding Rate Limits
Rate limits are applied per plan. Free trial: 100 total requests. Premium: 3k/day. Premium+: 6k/day.

## How to Avoid Hitting Limits
- Batch related questions into single prompts
- Use Sonnet for simple tasks (uses fewer resources)
- Space out requests during peak hours

## What to Do When Rate Limited
Wait for the limit to reset (daily for paid plans), or upgrade to a higher tier.
    `,
  },
  "unlimited-claude-access-guide": {
    title: "Unlimited Claude Access Guide",
    description: "Everything about getting unlimited Claude access through EcomAgent.",
    tag: "Setup",
    date: "2026-01-25",
    content: `
## What "Unlimited" Means
On paid plans (Premium, Premium+), token usage is unlimited. You pay for request capacity, not tokens.

## Getting Started
1. Sign up at ecomagent.in
2. Generate your API key
3. Configure Claude Code
4. Start coding without token stress

## Plan Options
- Premium ($69/mo): 3k requests/day, unlimited tokens
- Premium+ ($149/mo): 6k requests/day, unlimited tokens
- Custom: Fully unlimited with enterprise support
    `,
  },
  "reduce-interruptions-in-long-prompt-sessions": {
    title: "Reduce Interruptions in Long Sessions",
    description: "Strategies to minimize interruptions during long prompt sessions.",
    tag: "Workflow",
    date: "2026-01-22",
    content: `
## Optimize Your Prompts
Clear, specific prompts reduce back-and-forth and keep sessions flowing.

## Use Streaming
Enable streaming responses so you see output as it generates, reducing perceived wait time.

## Monitor Your Limits
Keep an eye on your dashboard usage stats so you don't get surprised by a rate limit mid-session.
    `,
  },
  "signup-to-first-api-call-checklist": {
    title: "Signup to First API Call Checklist",
    description: "Step-by-step checklist from account creation to your first successful API call.",
    tag: "Setup",
    date: "2026-01-20",
    content: `
## Checklist
- [ ] Create an account at ecomagent.in/signup
- [ ] Verify your email
- [ ] Log in to the dashboard
- [ ] Generate a free trial API key
- [ ] Copy the key
- [ ] Open your Claude Code settings.json
- [ ] Paste the endpoint and key
- [ ] Run a test prompt
- [ ] Confirm response ✓
    `,
  },
  "connect-claude-code-custom-endpoint": {
    title: "Connect Claude Code to Custom Endpoint",
    description: "How to configure Claude Code to use the EcomAgent custom API endpoint.",
    tag: "Setup",
    date: "2026-01-18",
    content: `
## The Configuration
Add this to your \`~/.claude/settings.json\` (or \`%USERPROFILE%\\.claude\\settings.json\` on Windows):

\`\`\`json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.ecomagent.in/",
    "ANTHROPIC_AUTH_TOKEN": "YOUR_API_KEY"
  }
}
\`\`\`

## Why Custom Endpoints?
Custom endpoints let you route Claude traffic through optimized infrastructure with better pricing and unlimited token capacity.
    `,
  },
  "free-api-key-myths-and-real-options": {
    title: "Free API Key Myths & Real Options",
    description: "Separating fact from fiction about free API keys for AI models.",
    tag: "Pricing",
    date: "2026-01-15",
    content: `
## Myth: Completely Free Unlimited API Keys Exist
False. All providers have limits on free tiers. Anyone claiming otherwise is misleading.

## Reality: Free Trials Exist
EcomAgent offers a genuine free trial with 100 requests and 10M tokens. This lets you test everything before paying.

## Best Strategy
Use the free trial to confirm Claude Code works for your workflow, then choose a paid plan that fits your volume.
    `,
  },
  "openrouter-vs-plan-based-claude-access": {
    title: "OpenRouter vs Plan-Based Claude Access",
    description: "Comparing OpenRouter pay-per-token vs EcomAgent plan-based unlimited access.",
    tag: "Pricing",
    date: "2026-01-12",
    content: `
## OpenRouter: Pay Per Token
OpenRouter charges per token used. This works for light usage but costs add up quickly during active coding sessions.

## EcomAgent: Plan-Based
EcomAgent charges a flat monthly fee with unlimited tokens on paid plans. Predictable costs, no bill shock.

## Which Is Better?
If you code daily with Claude, plan-based pricing is almost always cheaper. If you use Claude occasionally, pay-per-token might work.
    `,
  },
  "huggingface-vs-direct-claude-endpoints": {
    title: "HuggingFace vs Direct Claude Endpoints",
    description: "Pros and cons of different ways to access Claude models.",
    tag: "Setup",
    date: "2026-01-10",
    content: `
## HuggingFace
HuggingFace provides access to many models but doesn't directly host Claude. Third-party wrappers add latency.

## Direct Anthropic API
The official API is reliable but expensive for heavy usage without enterprise deals.

## EcomAgent Custom Endpoint
An optimized endpoint specifically for Claude Code workflows. Lower cost, unlimited tokens on paid plans, and a simple setup.

## Our Recommendation
For Claude Code users, a dedicated endpoint like EcomAgent provides the best experience and value.
    `,
  },
};

export async function generateStaticParams() {
  return Object.keys(blogPosts).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts[slug];
  if (!post) return { title: "Post Not Found" };

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
    },
  };
}

// Simple markdown-to-jsx renderer for our blog content
function renderMarkdown(content: string) {
  const lines = content.trim().split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={key++} className="bg-background rounded-lg p-4 text-xs font-mono text-muted-foreground overflow-x-auto border border-border my-4">
            <code>{codeBlockContent.join("\n")}</code>
          </pre>
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    if (line.startsWith("## ")) {
      elements.push(<h2 key={key++} className="text-xl font-bold mt-8 mb-3">{line.slice(3)}</h2>);
    } else if (line.startsWith("- [ ] ")) {
      elements.push(
        <li key={key++} className="flex items-center gap-2 text-sm text-muted-foreground ml-4">
          <span className="w-4 h-4 border border-border rounded" />
          {line.slice(6)}
        </li>
      );
    } else if (line.startsWith("- ")) {
      elements.push(
        <li key={key++} className="text-sm text-muted-foreground ml-4 list-disc">{line.slice(2)}</li>
      );
    } else if (line.trim() === "") {
      // skip empty lines
    } else {
      // Inline code
      const formatted = line.replace(/`([^`]+)`/g, '<code class="text-accent bg-background px-1 py-0.5 rounded text-xs">$1</code>');
      elements.push(
        <p key={key++} className="text-sm text-muted-foreground leading-relaxed mb-3" dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    }
  }

  return elements;
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = blogPosts[slug];

  if (!post) {
    notFound();
  }

  const tagColors: Record<string, string> = {
    Setup: "bg-primary/10 text-primary border-primary/20",
    Security: "bg-danger/10 text-danger border-danger/20",
    Pricing: "bg-success/10 text-success border-success/20",
    Workflow: "bg-accent/10 text-accent border-accent/20",
    Troubleshooting: "bg-warning/10 text-warning border-warning/20",
  };

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20">
        <article className="max-w-3xl mx-auto px-4 sm:px-6">
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to blog
          </Link>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2.5 py-0.5 text-xs rounded-full border ${tagColors[post.tag] || ""}`}>
                {post.tag}
              </span>
              <span className="text-xs text-muted">
                {new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">{post.title}</h1>
            <p className="text-muted-foreground">{post.description}</p>
          </div>

          <div className="glass rounded-xl p-8">
            {renderMarkdown(post.content)}
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
