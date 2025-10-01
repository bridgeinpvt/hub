import { generateSEO, pageSEO } from "@/lib/seo";

export const metadata = generateSEO(pageSEO.home);

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}