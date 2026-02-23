import { z } from "zod";

export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export const dateRangeSchema = z.object({
  from: z.date().optional(),
  to: z.date().optional(),
});

export const uuidSchema = z.string().min(1);

export const addressSchema = z.object({
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
});

export const ukPostcodeSchema = z
  .string()
  .regex(/^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/i, "Invalid UK postcode")
  .optional();

export const chiNumberSchema = z
  .string()
  .regex(/^\d{10}$/, "CHI number must be 10 digits")
  .optional();

export const phoneSchema = z
  .string()
  .regex(/^[0-9\s\w+\-\(\)]{7,15}$/, "Invalid phone number")
  .optional();
