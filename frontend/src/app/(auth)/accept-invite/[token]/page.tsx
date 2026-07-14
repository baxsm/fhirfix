import type { Metadata } from "next";
import { AcceptInviteView } from "./accept-invite-view";

export const metadata: Metadata = { title: "Accept invite · FHIRfix" };

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <AcceptInviteView token={token} />;
}
