import { SendMailClient } from "zeptomail";
import { env } from "./env";
import { logger } from "./logger";

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

let client: SendMailClient | null = null;

function getClient(): SendMailClient {
  if (!client) {
    client = new SendMailClient({
      url: "api.zeptomail.com/",
      token: env.ZEPTOMAIL_TOKEN,
    });
  }
  return client;
}

// in test mode (local dev + tests) we log instead of sending, so no real
// email traffic and tests can assert on the captured payload.
export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<void> {
  if (env.EMAIL_TEST_MODE || !env.ZEPTOMAIL_TOKEN) {
    logger.info("email.testMode", `to: ${to} | subject: ${subject}`);
    lastTestEmail = { to, subject, html, text };
    // optional file sink so integration/e2e tests can extract verify/reset links.
    const captureFile = process.env.EMAIL_CAPTURE_FILE;
    if (captureFile) {
      const line = `${JSON.stringify({ to, subject, text, at: new Date().toISOString() })}\n`;
      const existing = await Bun.file(captureFile)
        .text()
        .catch(() => "");
      await Bun.write(captureFile, existing + line);
    }
    return;
  }

  try {
    await getClient().sendMail({
      from: { address: env.ZEPTOMAIL_FROM_ADDRESS, name: env.ZEPTOMAIL_FROM_NAME },
      to: [{ email_address: { address: to, name: to } }],
      subject,
      htmlbody: html,
      textbody: text,
    });
  } catch (err) {
    logger.error("email.send", err);
    throw err;
  }
}

// captured last send when EMAIL_TEST_MODE is on, so integration tests can
// read the verification/reset link out of the body.
export let lastTestEmail: SendArgs | null = null;
export function clearTestEmail() {
  lastTestEmail = null;
}
