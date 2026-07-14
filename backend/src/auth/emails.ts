// plain, product-voice transactional emails. no marketing language.

type Email = { subject: string; html: string; text: string };

function wrap(title: string, body: string, cta?: { label: string; url: string }): string {
  const button = cta
    ? `<a href="${cta.url}" style="display:inline-block;background:#10a37f;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">${cta.label}</a>`
    : "";
  return `<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:480px;margin:0 auto;color:#0f1011">
    <h2 style="font-size:18px;margin:0 0 12px">${title}</h2>
    <div style="font-size:14px;line-height:1.6;color:#383b3f">${body}</div>
    <div style="margin:20px 0">${button}</div>
    ${cta ? `<p style="font-size:12px;color:#8a8f98">Or paste this link into your browser:<br>${cta.url}</p>` : ""}
  </div>`;
}

export function verificationEmail(url: string): Email {
  return {
    subject: "Verify your FHIRfix email",
    html: wrap(
      "Verify your email",
      "Confirm this address to finish setting up your FHIRfix account.",
      {
        label: "Verify email",
        url,
      },
    ),
    text: `Verify your FHIRfix email. Open this link: ${url}`,
  };
}

export function resetPasswordEmail(url: string): Email {
  return {
    subject: "Reset your FHIRfix password",
    html: wrap(
      "Reset your password",
      "Use the link below to set a new password. If you did not request this, you can ignore this email.",
      { label: "Reset password", url },
    ),
    text: `Reset your FHIRfix password. Open this link: ${url}`,
  };
}

export function magicLinkEmail(url: string, workspaceName?: string): Email {
  const body = workspaceName
    ? `You were invited to join the ${workspaceName} workspace on FHIRfix. Open the link to accept.`
    : "Use the link below to sign in to FHIRfix.";
  return {
    subject: workspaceName ? `Join ${workspaceName} on FHIRfix` : "Sign in to FHIRfix",
    html: wrap(workspaceName ? "Workspace invitation" : "Sign in", body, {
      label: workspaceName ? "Accept invite" : "Sign in",
      url,
    }),
    text: `${body} Open this link: ${url}`,
  };
}
