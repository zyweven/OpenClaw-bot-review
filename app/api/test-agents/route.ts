import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const OPENCLAW_HOME = process.env.OPENCLAW_HOME || path.join(process.env.HOME || "", ".openclaw");
const CONFIG_PATH = path.join(OPENCLAW_HOME, "openclaw.json");

// Resolve the model string (e.g. "yunyi-claude/claude-opus-4-6") to provider + modelId
function resolveModel(config: any, modelStr: string) {
  const [providerId, ...rest] = modelStr.split("/");
  const modelId = rest.join("/");
  const provider = config.models?.providers?.[providerId];
  return { providerId, modelId, provider };
}

async function testModel(provider: any, modelId: string): Promise<{ ok: boolean; text?: string; error?: string; elapsed: number }> {
  const baseUrl = provider.baseUrl;
  const apiKey = provider.apiKey || "";
  const api = provider.api;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const startTime = Date.now();

  try {
    if (api === "anthropic-messages") {
      const authHeader = provider.authHeader || "x-api-key";
      headers[authHeader] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      if (provider.headers) Object.assign(headers, provider.headers);

      const body = {
        model: modelId,
        max_tokens: 32,
        messages: [{ role: "user", content: "Say hi in 3 words." }],
      };

      const resp = await fetch(`${baseUrl}/v1/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(100000),
      });

      const elapsed = Date.now() - startTime;
      const data = await resp.json();

      if (!resp.ok) {
        return { ok: false, error: data.error?.message || JSON.stringify(data), elapsed };
      }
      return { ok: true, text: data.content?.[0]?.text || "", elapsed };

    } else if (api === "openai-completions") {
      headers["Authorization"] = `Bearer ${apiKey}`;

      const body = {
        model: modelId,
        max_tokens: 32,
        messages: [{ role: "user", content: "Say hi in 3 words." }],
      };

      const resp = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(100000),
      });

      const elapsed = Date.now() - startTime;
      const data = await resp.json();

      if (!resp.ok) {
        return { ok: false, error: data.error?.message || JSON.stringify(data), elapsed };
      }
      return { ok: true, text: data.choices?.[0]?.message?.content || "", elapsed };

    } else {
      return { ok: false, error: `Unknown API type: ${api}`, elapsed: Date.now() - startTime };
    }
  } catch (err: any) {
    return { ok: false, error: err.message, elapsed: Date.now() - startTime };
  }
}

export async function POST() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const config = JSON.parse(raw);

    const defaults = config.agents?.defaults || {};
    const defaultModel = typeof defaults.model === "string"
      ? defaults.model
      : defaults.model?.primary || "unknown";

    // Discover agents
    let agentList = config.agents?.list || [];
    if (agentList.length === 0) {
      try {
        const agentsDir = path.join(OPENCLAW_HOME, "agents");
        const dirs = fs.readdirSync(agentsDir, { withFileTypes: true });
        agentList = dirs
          .filter((d: any) => d.isDirectory() && !d.name.startsWith("."))
          .map((d: any) => ({ id: d.name }));
      } catch {}
      if (agentList.length === 0) {
        agentList = [{ id: "main" }];
      }
    }

    // Test each agent's model in parallel
    const results = await Promise.all(
      agentList.map(async (agent: any) => {
        const modelStr = agent.model || defaultModel;
        const { providerId, modelId, provider } = resolveModel(config, modelStr);

        if (!provider) {
          return {
            agentId: agent.id,
            model: modelStr,
            ok: false,
            error: `Provider "${providerId}" not found`,
            elapsed: 0,
          };
        }

        const result = await testModel(provider, modelId);
        return {
          agentId: agent.id,
          model: modelStr,
          ...result,
        };
      })
    );

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
