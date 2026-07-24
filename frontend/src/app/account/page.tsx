import type { Metadata } from "next";
import { AccountView } from "./account-view";

// the root layout's title template already appends "· FHIRfix".
export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return <AccountView />;
}
