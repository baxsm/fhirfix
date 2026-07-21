export const metadata = {
  title: "Privacy Policy",
};

// TODO(gap: legal content): placeholder page. real Privacy Policy copy is not
// written yet and must be added before launch (owned by phase 8, launch
// readiness - see docs/phases/phase-8.md). the route exists so the auth-panel
// and footer links resolve instead of 404ing. do NOT ship fake legal text here.
// chrome (header/footer/light-lock) comes from src/app/(marketing)/layout.tsx.
export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-16 sm:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        The Privacy Policy is being finalized and will be published here before general
        availability.
      </p>
    </div>
  );
}
