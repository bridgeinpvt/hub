import { generateSEO, pageSEO } from "@/lib/seo";

export const metadata = generateSEO(pageSEO.settings);

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}