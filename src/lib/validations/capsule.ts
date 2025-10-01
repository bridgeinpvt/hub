import { z } from "zod";
import { CapsuleType } from "@prisma/client";

// Simple validation schema based on Prisma schema
export const capsuleCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.number().min(0, "Price must be 0 or higher"),
  type: z.nativeEnum(CapsuleType),
  logoUrl: z.string().optional().nullable(),
});

export type CapsuleCreateInput = z.infer<typeof capsuleCreateSchema>;

// Form validation schema (accepts string inputs before transformation)
export const capsuleCreateFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.string().min(1, "Price is required").transform((val) => parseFloat(val)),
  type: z.string().transform((val) => val as CapsuleType),
  logoUrl: z.string().optional().nullable(),
});

export type CapsuleCreateFormInput = z.infer<typeof capsuleCreateFormSchema>;

// Character count helpers
export const getNameCharacterCount = (name: string): { current: number; max: number; isValid: boolean } => {
  const current = name.length;
  const max = 100;
  return {
    current,
    max,
    isValid: current >= 1 && current <= max
  };
};

export const getDescriptionCharacterCount = (description: string): { current: number; max: number; isValid: boolean } => {
  const current = description.length;
  const max = 1000;
  return {
    current,
    max,
    isValid: current >= 1 && current <= max
  };
};