export interface SlackCommandPayload {
  token: string;
  teamId: string;
  teamDomain: string;
  channelId: string;
  channelName: string;
  userId: string;
  userName: string;
  command: string;
  text: string;
  responseUrl: string;
  triggerId: string;
}

export interface SlackInstallation {
  id: string;
  teamId: string;
  slackTeamId: string;
  slackTeamName: string | null;
  botToken: string;
  botUserId: string | null;
  installerUserId: string | null;
  scopes: string[];
  incomingWebhookUrl: string | null;
  incomingWebhookChannel: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SlackChannelMapping {
  id: string;
  teamId: string;
  slackChannelId: string;
  slackChannelName: string | null;
  campaignId: string | null;
  purpose: "content_delivery" | "review" | "notifications";
  createdAt: string;
}
