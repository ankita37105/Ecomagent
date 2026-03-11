"use client";

import { useMemo, useState } from "react";
import { Copy, Check } from "lucide-react";

type TabKey = "curl" | "openai-sdk" | "streaming" | "test-completion" | "claude-code";

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded-md bg-border/50 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        title="Copy code"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <pre className="bg-background rounded-lg p-4 text-xs font-mono text-muted-foreground overflow-x-auto border border-border">
        <code>{code}</code>
      </pre>
      <span className="absolute left-3 top-3 text-[10px] uppercase tracking-wider text-muted-foreground/70">{lang}</span>
    </div>
  );
}

export default function DocsContent() {
  const [activeTab, setActiveTab] = useState<TabKey>("curl");

  const tabs = useMemo(
    () => [
      { key: "curl", label: "cURL Example" },
      { key: "openai-sdk", label: "OpenAI SDK" },
      { key: "streaming", label: "Streaming Example" },
      { key: "test-completion", label: "Test Completion" },
      { key: "claude-code", label: "Claude Code" },
    ] as Array<{ key: TabKey; label: string }>,
    []
  );

  return (
    <div className="space-y-8">
      <section className="glass rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-4">API Endpoint</h2>
        <div className="rounded-lg border border-border bg-background p-4 text-sm font-mono">
          <span className="text-muted-foreground">Base URL:</span>{" "}
          <span className="text-accent">https://api.ecomagent.in/v1</span>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Replace <code>YOUR_API_KEY</code> with your actual API key from your dashboard.
        </p>
      </section>

      <section>
        <div className="flex flex-wrap gap-2 mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg border text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "curl" && (
          <div className="glass rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">cURL Example</h3>
              <p className="text-sm text-muted-foreground">Make API requests directly from your terminal using cURL.</p>
            </div>

            <div>
              <h4 className="text-base font-semibold mb-3">Basic Chat Completion</h4>
              <CodeBlock
                lang="bash"
                code={`#!/usr/bin/env sh

BASE_URL="https://api.ecomagent.in/v1"
API_KEY="YOUR_API_KEY"

curl "$BASE_URL/chat/completions" \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-opus-4.6",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'`}
              />
            </div>

            <div>
              <h4 className="text-base font-semibold mb-3">With Streaming</h4>
              <CodeBlock
                lang="bash"
                code={`# With streaming
curl "$BASE_URL/chat/completions" \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-opus-4.6",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "stream": true
  }'`}
              />
            </div>

            <div>
              <h4 className="text-base font-semibold mb-3">Expected Output</h4>
              <CodeBlock
                lang="json"
                code={`{
  "choices": [
    {
      "finish_reason": "stop",
      "message": {
        "content": "Hello! How are you doing today? Is there something I can help you with?",
        "role": "assistant"
      }
    }
  ],
  "created": 1769095572,
  "id": "msg_vrtx_01XNdd65BAkT82dLgksZGWD3",
  "usage": {
    "completion_tokens": 20,
    "prompt_tokens": 9,
    "prompt_tokens_details": {
      "cached_tokens": 0
    },
    "total_tokens": 29
  },
  "model": "claude-opus-4.6"
}`}
              />
            </div>
          </div>
        )}

        {activeTab === "openai-sdk" && (
          <div className="glass rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">OpenAI SDK Example</h3>
              <p className="text-sm text-muted-foreground">Use the official OpenAI Python SDK with our API.</p>
            </div>
            <CodeBlock
              lang="python"
              code={`from openai import OpenAI

BASE_URL = "https://api.ecomagent.in/v1"
API_KEY = "YOUR_API_KEY"


def main():
    client = OpenAI(
        api_key=API_KEY,
        base_url=BASE_URL,
    )

    response = client.chat.completions.create(
        model="claude-opus-4.6",
        messages=[
            {"role": "user", "content": "Hello!"}
        ],
    )

    print(response.choices[0].message.content)


if __name__ == "__main__":
    main()`}
            />

            <div>
              <h4 className="text-base font-semibold mb-3">Expected Output</h4>
              <CodeBlock
                lang="text"
                code={`Hello! How are you doing today? Is there something I can help you with?`}
              />
            </div>
          </div>
        )}

        {activeTab === "streaming" && (
          <div className="glass rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">Streaming Example</h3>
              <p className="text-sm text-muted-foreground">Stream responses in real-time using the requests library.</p>
            </div>
            <CodeBlock
              lang="python"
              code={`import requests

BASE_URL = "https://api.ecomagent.in/v1"
API_KEY = "YOUR_API_KEY"


def main():
    response = requests.post(
        f"{BASE_URL}/chat/completions",
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": "claude-opus-4.6",
            "messages": [
                {"role": "user", "content": "Hello!"}
            ],
            "stream": True,
        },
        stream=True,
    )

    for line in response.iter_lines():
        if line:
            print(line.decode("utf-8"))


if __name__ == "__main__":
    main()`}
            />

            <div>
              <h4 className="text-base font-semibold mb-3">Expected Output</h4>
              <CodeBlock
                lang="text"
                code={`data: {"choices":[{"index":0,"delta":{"content":"Hello! How are","role":"assistant"}}],"created":1769095541,"id":"msg_vrtx_015r8zkxSn7FPCuAziyWJjgp","model":"claude-opus-4.6"}

data: {"choices":[{"index":0,"delta":{"content":" you doing today?","role":"assistant"}}],"created":1769095541,"id":"msg_vrtx_015r8zkxSn7FPCuAziyWJjgp","model":"claude-opus-4.6"}

data: {"choices":[{"finish_reason":"stop","index":0,"delta":{"content":null}}],"created":1769095541,"id":"msg_vrtx_015r8zkxSn7FPCuAziyWJjgp","usage":{"completion_tokens":20,"prompt_tokens":9,"prompt_tokens_details":{"cached_tokens":0},"total_tokens":29},"model":"claude-opus-4.6"}

data: [DONE]`}
              />
            </div>
          </div>
        )}

        {activeTab === "test-completion" && (
          <div className="glass rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">Test Completion</h3>
              <p className="text-sm text-muted-foreground">A complete test script with error handling and JSON output.</p>
            </div>
            <CodeBlock
              lang="python"
              code={`import requests
import json
import time

# Configuration
API_KEY = "YOUR_API_KEY"
BASE_URL = "https://api.ecomagent.in/v1"

def run_chat_example():
    print("\\n--- Testing Model: claude-opus-4.6 ---")
    url = f"{BASE_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "claude-opus-4.6",
        "messages": [
            {"role": "user", "content": "Hello! Are you working?"}
        ]
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Response Body:")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Failed to connect: {e}")

if __name__ == "__main__":
    time.sleep(2)
    run_chat_example()`}
            />

            <div>
              <h4 className="text-base font-semibold mb-3">Expected Output</h4>
              <CodeBlock
                lang="text"
                code={`--- Testing Model: claude-opus-4.6 ---
Status Code: 200
Response Body:
{
  "choices": [
    {
      "finish_reason": "stop",
      "message": {
        "content": "Hello! Yes, I'm working and ready to help. How can I assist you today?",
        "role": "assistant"
      }
    }
  ],
  "created": 1769095550,
  "id": "msg_vrtx_01DfUoCbURnkV7mQqYaoYjh2",
  "usage": {
    "completion_tokens": 22,
    "prompt_tokens": 13,
    "prompt_tokens_details": {
      "cached_tokens": 0
    },
    "total_tokens": 35
  },
  "model": "claude-opus-4.6"
}`}
              />
            </div>
          </div>
        )}

        {activeTab === "claude-code" && (
          <div className="glass rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">Claude Code Configuration</h3>
              <p className="text-sm text-muted-foreground">Configure the Claude Code CLI to use this proxy.</p>
            </div>

            <div className="rounded-lg border border-border bg-background p-4">
              <h4 className="font-medium mb-3">Configuration File Location</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                <li><strong>Windows:</strong> <code>%USERPROFILE%\\.claude\\settings.json</code></li>
                <li><strong>macOS / Linux:</strong> <code>~/.claude/settings.json</code></li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-3">Configuration Content</h4>
              <p className="text-sm text-muted-foreground mb-3">Add the following to your configuration file.</p>
              <CodeBlock
                lang="json"
                code={`{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.ecomagent.in/",
    "ANTHROPIC_AUTH_TOKEN": "YOUR_API_KEY",
    "ANTHROPIC_MODEL": "claude-opus-4.6",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "claude-sonnet-4-6",
    "ANTHROPIC_SMALL_FAST_MODEL": "claude-opus-4.6",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "claude-opus-4.6",
    "DISABLE_NON_ESSENTIAL_MODEL_CALLS": "1",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
    "CLAUDE_CODE_ATTRIBUTION_HEADER": "0"
  },
  "permissions": {
    "deny": ["WebSearch"]
  }
}`}
              />
              <p className="text-sm text-yellow-500/90 mt-3">Replace <code>YOUR_API_KEY</code> with your actual API key.</p>
            </div>
          </div>
        )}
      </section>

      <section className="glass rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Additional Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg border border-border bg-background p-4">
            <h3 className="font-medium mb-2">API Keys</h3>
            <p className="text-muted-foreground">Generate and manage your API keys securely.</p>
            <a href="/dashboard" className="inline-block mt-2 text-primary hover:underline">Manage Keys -&gt;</a>
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <h3 className="font-medium mb-2">Usage Stats</h3>
            <p className="text-muted-foreground">Monitor your API usage and costs.</p>
            <a href="/dashboard" className="inline-block mt-2 text-primary hover:underline">View Usage -&gt;</a>
          </div>
        </div>
      </section>
    </div>
  );
}
