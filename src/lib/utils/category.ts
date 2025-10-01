import { CapsuleType } from "@prisma/client";

export function getCategoryLabel(category: CapsuleType | "all"): string {
  switch (category) {
    case "all":
      return "All Categories";
    case "INFO_PRODUCTS":
      return "Info Products";
    case "DIGITAL_TOOLS":
      return "Digital Tools";
    case "CREATIVE_ASSETS":
      return "Creative Assets";
    case "SAAS_APIS":
      return "SaaS & APIs";
    case "SUBSCRIPTIONS":
      return "Subscriptions";
    default:
      return category;
  }
}

export const CATEGORY_OPTIONS = [
  { value: "all" as const, label: "All Categories" },
  { value: "INFO_PRODUCTS" as CapsuleType, label: "Info Products" },
  { value: "DIGITAL_TOOLS" as CapsuleType, label: "Digital Tools" },
  { value: "CREATIVE_ASSETS" as CapsuleType, label: "Creative Assets" },
  { value: "SAAS_APIS" as CapsuleType, label: "SaaS & APIs" },
  { value: "SUBSCRIPTIONS" as CapsuleType, label: "Subscriptions" },
] as const;