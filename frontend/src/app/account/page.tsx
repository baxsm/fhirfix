import type { Metadata } from "next";
import { AccountView } from "./account-view";

export const metadata: Metadata = { title: "Account · FHIRfix" };

export default function AccountPage() {
  return <AccountView />;
}
