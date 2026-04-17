/**
 * Block Kit builder helpers for Slack message formatting.
 */

type Block = Record<string, unknown>;

export function section(text: string, accessory?: Block): Block {
  return {
    type: "section",
    text: { type: "mrkdwn", text },
    ...(accessory ? { accessory } : {}),
  };
}

export function header(text: string): Block {
  return {
    type: "header",
    text: { type: "plain_text", text, emoji: true },
  };
}

export function divider(): Block {
  return { type: "divider" };
}

export function context(...elements: string[]): Block {
  return {
    type: "context",
    elements: elements.map((text) => ({ type: "mrkdwn", text })),
  };
}

export function actions(actionId: string, buttons: { text: string; value: string; style?: "primary" | "danger" }[]): Block {
  return {
    type: "actions",
    elements: buttons.map((btn) => ({
      type: "button",
      text: { type: "plain_text", text: btn.text, emoji: true },
      action_id: `${actionId}_${btn.value}`,
      value: btn.value,
      ...(btn.style ? { style: btn.style } : {}),
    })),
  };
}

/**
 * Format a content item's output as Block Kit blocks for Slack.
 */
export function contentBlocks(
  title: string,
  body: string,
  scores?: { overall: number } | null,
  contentId?: string
): Block[] {
  const blocks: Block[] = [
    header(title),
    section(body),
  ];

  if (scores) {
    blocks.push(
      context(`Score: *${scores.overall.toFixed(1)}/10*`)
    );
  }

  blocks.push(divider());

  if (contentId) {
    blocks.push(
      actions("content", [
        { text: "Approve", value: `approve_${contentId}`, style: "primary" },
        { text: "Edit in App", value: `edit_${contentId}` },
        { text: "Reject", value: `reject_${contentId}`, style: "danger" },
      ])
    );
  }

  return blocks;
}
