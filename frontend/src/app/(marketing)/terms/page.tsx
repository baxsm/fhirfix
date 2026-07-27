export const metadata = {
  title: "Terms of Service",
};

// TODO(gap: legal content): real Terms of Service copy must be added before launch (phase 8)
export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-16 sm:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        The Terms of Service are being finalized and will be published here before general
        availability.
      </p>
    </div>
  );
}
