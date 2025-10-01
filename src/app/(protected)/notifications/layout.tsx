import { generateSEO, pageSEO } from "@/lib/seo";

export const metadata = generateSEO(pageSEO.notifications);

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}