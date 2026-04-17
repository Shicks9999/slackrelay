/**
 * Minimal Slack Web API client — no SDK dependency.
 */

interface SlackAPIResponse {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

export class SlackClient {
  constructor(private botToken: string) {}

  async call(method: string, body: Record<string, unknown>): Promise<SlackAPIResponse> {
    const res = await fetch(`https://slack.com/api/${method}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.botToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as SlackAPIResponse;
    if (!data.ok) {
      throw new Error(`Slack API error (${method}): ${data.error}`);
    }
    return data;
  }

  async postMessage(channel: string, text: string, blocks?: unknown[]) {
    return this.call("chat.postMessage", {
      channel,
      text,
      ...(blocks ? { blocks } : {}),
    });
  }

  async postEphemeral(
    channel: string,
    user: string,
    text: string,
    blocks?: unknown[]
  ) {
    return this.call("chat.postEphemeral", {
      channel,
      user,
      text,
      ...(blocks ? { blocks } : {}),
    });
  }

  async respondToUrl(responseUrl: string, payload: Record<string, unknown>) {
    const res = await fetch(responseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Failed to respond to Slack: ${res.status}`);
    }
  }
}

/**
 * Get a SlackClient for a given bot token.
 */
export function createSlackClient(botToken: string): SlackClient {
  return new SlackClient(botToken);
}
