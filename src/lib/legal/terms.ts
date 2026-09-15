/**
 * Terms of use + privacy notice shown at the end of onboarding, before any
 * profile data is written to the backend. Bump TERMS_VERSION whenever the
 * copy changes materially - profiles record which version they accepted
 * (Profile.termsVersion / termsAcceptedAt), so re-consent can be required
 * on a bump if needed later. Keep this the single source of truth: the
 * compact onboarding step and the full /legal/terms page both render from
 * TERMS_SECTIONS rather than duplicating copy.
 */
export const TERMS_VERSION = "2026-09-15";

export interface TermsSection {
  heading: string;
  body: string[];
}

/**
 * Placeholders in ALL CAPS square brackets ([APP OPERATOR], [CONTACT EMAIL])
 * are not real legal detail - swap them for the real operator/contact before
 * this is used with actual users. Nothing here is legal advice; it's a
 * reasonable-faith GDPR-shaped starting point for a small personal-data-
 * collecting app, not a substitute for a lawyer if this becomes a real product.
 */
export const TERMS_SECTIONS: TermsSection[] = [
  {
    heading: "Who this is",
    body: [
      "This app helps you plan and shop for university move-in: a checklist, a budget, price comparisons, and (if you choose) a way to let a parent follow along.",
      "The app is operated by [APP OPERATOR]. Questions about your data go to [CONTACT EMAIL].",
    ],
  },
  {
    heading: "What we collect",
    body: [
      "Account: your email address, used only to sign you in via a magic link.",
      "Profile: your name, university, university location, year of study, chosen accommodation, move-in date and budget.",
      "Checklist & shopping: item statuses, your basket, purchases you log, and price-watch data.",
      "Optional: your device location, only if you tap \"Use my location\" to find nearby shops - it is used for that search and not stored against your profile.",
      "Optional: if you connect a retailer, a record that the connection exists and the access it needed - never your retailer password.",
      "If you invite a parent to follow along, they see only what you choose to share (checklist and/or budget), and can be removed at any time from the Me screen.",
    ],
  },
  {
    heading: "Why, and on what basis",
    body: [
      "Core features (checklist, budget, showing your profile back to you) run on contract necessity - we need this data to provide the service you signed up for.",
      "Anything optional (device location for a search, a store connection, sharing with a parent) runs on your explicit consent, asked for at the point you switch it on, and withdrawable at any time from the app without affecting the rest of the service.",
    ],
  },
  {
    heading: "Who else sees it",
    body: [
      "Supabase hosts the database and handles sign-in; they process data on our instruction under their own data processing terms.",
      "If you connect a retailer, the minimum data needed for that connection is shared with them - never sold, and never used for anything beyond what you connected it for.",
      "We do not sell your data, and we do not share it with anyone else without telling you first.",
    ],
  },
  {
    heading: "How long we keep it",
    body: [
      "For as long as your account is active. If you delete your account, your profile, checklist, basket, purchases and any parent-sharing links are deleted; ask [CONTACT EMAIL] if you'd like this sooner or if account deletion isn't yet available in-app.",
    ],
  },
  {
    heading: "Your rights",
    body: [
      "Under UK/EU GDPR you can ask to access, correct, export, or delete your data, object to or restrict how it's used, and withdraw any consent you've given - at any time, free of charge, without it affecting your access to the app's core features.",
      "To exercise any of these, contact [CONTACT EMAIL]. If you're not satisfied with the response, you can complain to your national data protection authority (in the UK, the ICO - ico.org.uk).",
    ],
  },
  {
    heading: "Security",
    body: [
      "Data is encrypted in transit and at rest via Supabase, and access is restricted so only you (and anyone you've explicitly shared with) can read your data.",
      "No system is perfectly secure; if we ever become aware of a breach affecting your data, we'll tell you and the relevant regulator as required by law.",
    ],
  },
  {
    heading: "Who this is for",
    body: [
      "This app is built for students starting university, typically 18 and over. If you're under 18, please check with a parent or guardian before creating an account.",
    ],
  },
  {
    heading: "Changes to this notice",
    body: [
      `This is version ${TERMS_VERSION}. If we make a material change, we'll ask you to review and accept it again before you continue using the app.`,
    ],
  },
];
