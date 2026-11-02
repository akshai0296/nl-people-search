import type { Metadata } from "next";
import { SavedSearchesPage } from "@/components/saved/saved-searches-page";

export const metadata: Metadata = { title: "Saved searches" };

export default function Page() {
  return <SavedSearchesPage />;
}
