import type { Metadata } from "next";
import { CandidateProfile } from "@/components/people/candidate-profile";

export const metadata: Metadata = { title: "Candidate" };

export default function Page() {
  return <CandidateProfile />;
}
