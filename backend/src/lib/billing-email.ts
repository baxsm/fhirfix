import { sendEmail } from "./email";
import { env } from "./env";

export async function sendLowBalanceEmail(args: {
  to: string;
  threshold: number;
  balanceMicro: number;
}): Promise<void> {
  const { to, threshold, balanceMicro } = args;
  const dollars = (balanceMicro / 1_000_000).toFixed(2);
  const billingUrl = `${env.APP_URL}/app/billing`;

  await sendEmail({
    to,
    subject: `Your FHIRfix balance is down to $${dollars}`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:560px">
<h2 style="margin:0 0 4px">Balance running low</h2>
<p style="color:#555;margin:0 0 16px">You have used ${threshold}% of your credits. $${dollars} remains.</p>
<p style="color:#555;margin:0 0 16px">Runs stop when the balance reaches zero.</p>
<p style="margin:16px 0"><a href="${billingUrl}" style="background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Add credits</a></p>
</div>`,
    text: [
      `Balance running low: $${dollars} remaining.`,
      `You have used ${threshold}% of your credits.`,
      "Runs stop when the balance reaches zero.",
      "",
      `Add credits: ${billingUrl}`,
    ].join("\n"),
  });
}
