import type { SlackCommandPayload } from "@/types/slack";

/**
 * Parse a URL-encoded Slack command payload into a typed object.
 */
export function parseCommandPayload(body: string): SlackCommandPayload {
  const params = new URLSearchParams(body);
  return {
    token: params.get("token") ?? "",
    teamId: params.get("team_id") ?? "",
    teamDomain: params.get("team_domain") ?? "",
    channelId: params.get("channel_id") ?? "",
    channelName: params.get("channel_name") ?? "",
    userId: params.get("user_id") ?? "",
    userName: params.get("user_name") ?? "",
    command: params.get("command") ?? "",
    text: params.get("text") ?? "",
    responseUrl: params.get("response_url") ?? "",
    triggerId: params.get("trigger_id") ?? "",
  };
}
