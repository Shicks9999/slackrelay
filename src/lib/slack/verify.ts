import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify that a request is from Slack using the signing secret.
 * https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function verifySlackSignature(
  signingSecret: string,
  signature: string,
  timestamp: string,
  body: string
): boolean {
  // Reject requests older than 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 60 * 5) {
    return false;
  }

  const baseString = `v0:${timestamp}:${body}`;
  const hmac = createHmac("sha256", signingSecret)
    .update(baseString)
    .digest("hex");
  const expectedSignature = `v0=${hmac}`;

  return timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Extract and verify Slack request headers from a Request object.
 * Returns the raw body string for further parsing.
 */
export async function verifySlackRequest(
  request: Request
): Promise<{ verified: boolean; body: string }> {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    return { verified: false, body: "" };
  }

  const signature = request.headers.get("x-slack-signature") ?? "";
  const timestamp = request.headers.get("x-slack-request-timestamp") ?? "";
  const body = await request.text();

  const verified = verifySlackSignature(
    signingSecret,
    signature,
    timestamp,
    body
  );

  return { verified, body };
}
