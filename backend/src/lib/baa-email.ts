import { sendEmail } from "./email";
import { env } from "./env";

// goes to the compliance inbox, not the requester: a baa is countersigned by a human
export async function sendBaaRequestEmail(args: {
  workspaceName: string;
  workspaceSlug: string;
  requestedByName: string;
  requestedByEmail: string;
}): Promise<void> {
  const { workspaceName, workspaceSlug, requestedByName, requestedByEmail } = args;

  await sendEmail({
    to: env.COMPLIANCE_EMAIL,
    subject: `BAA requested: ${workspaceName}`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:560px">
<h2 style="margin:0 0 4px">BAA requested</h2>
<p style="color:#555;margin:0 0 16px">${requestedByName} requested a Business Associate Agreement for a workspace.</p>
<table style="border-collapse:collapse;font-size:14px;color:#333">
<tr><td style="padding:4px 16px 4px 0;color:#777">Workspace</td><td>${workspaceName}</td></tr>
<tr><td style="padding:4px 16px 4px 0;color:#777">Slug</td><td>${workspaceSlug}</td></tr>
<tr><td style="padding:4px 16px 4px 0;color:#777">Requested by</td><td>${requestedByName} (${requestedByEmail})</td></tr>
</table>
<p style="color:#555;margin:16px 0 0">Reply to the requester with the agreement to countersign.</p>
</div>`,
    text: [
      "BAA requested.",
      "",
      `Workspace: ${workspaceName} (${workspaceSlug})`,
      `Requested by: ${requestedByName} (${requestedByEmail})`,
      "",
      "Reply to the requester with the agreement to countersign.",
    ].join("\n"),
  });
}
