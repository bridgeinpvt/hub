import { generateSEO, pageSEO } from "@/lib/seo";

export const metadata = generateSEO(pageSEO.messages);

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}