import type { Metadata } from "next";
import { ShortlistsPage } from "@/components/shortlists/shortlists-page";

export const metadata: Metadata = { title: "Shortlists" };

export default function Page() {
  return <ShortlistsPage />;
}
