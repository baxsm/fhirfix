import { SharedReport } from "./shared-report";

export const metadata = {
  title: "Shared report",
};

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SharedReport token={token} />;
}
