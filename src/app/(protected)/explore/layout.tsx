import { generateSEO, pageSEO } from "@/lib/seo";

export const metadata = generateSEO(pageSEO.explore);

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}