import type { Metadata } from "next";
import { ShortlistDetailPage } from "@/components/shortlists/shortlist-detail";

export const metadata: Metadata = { title: "Shortlist" };

export default function Page() {
  return <ShortlistDetailPage />;
}
