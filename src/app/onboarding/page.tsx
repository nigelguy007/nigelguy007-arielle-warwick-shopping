import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const store = await getStore();
  const profile = await store.getProfile(user.id);
  if (profile?.onboardingComplete) redirect("/");
  const accommodations = await store.listAccommodations();
  return <OnboardingFlow accommodations={accommodations} firstName={profile?.firstName ?? ""} university={profile?.university ?? "University of Warwick"} />;
}
