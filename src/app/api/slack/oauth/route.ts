import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Slack OAuth callback — exchanges code for bot token and stores installation.
 * Slack redirects here after a user installs the app.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state"); // team_id passed during install

  if (!code) {
    return NextResponse.redirect(new URL("/settings?error=missing_code", request.url));
  }

  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/settings?error=slack_not_configured", request.url)
    );
  }

  // Exchange code for token
  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.ok) {
    return NextResponse.redirect(
      new URL(`/settings?error=${tokenData.error}`, request.url)
    );
  }

  // Store installation
  const supabase = createAdminClient();

  const installData = {
    team_id: state ?? null,
    slack_team_id: tokenData.team.id,
    slack_team_name: tokenData.team.name,
    bot_token: tokenData.access_token,
    bot_user_id: tokenData.bot_user_id ?? null,
    installer_user_id: tokenData.authed_user?.id ?? null,
    scopes: tokenData.scope?.split(",") ?? [],
    incoming_webhook_url: tokenData.incoming_webhook?.url ?? null,
    incoming_webhook_channel: tokenData.incoming_webhook?.channel ?? null,
  };

  // Upsert by slack_team_id
  await supabase
    .from("slack_installations")
    .upsert(installData, { onConflict: "slack_team_id" });

  return NextResponse.redirect(
    new URL("/settings?slack=connected", request.url)
  );
}
