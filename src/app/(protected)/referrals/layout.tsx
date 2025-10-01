import { generateSEO, pageSEO } from "@/lib/seo";

export const metadata = generateSEO(pageSEO.referrals);

export default function ReferralsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}