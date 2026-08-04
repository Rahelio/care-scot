import { z } from "zod";

export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  // Several client-picker dropdowns (incident/safeguarding/complaint/survey/
  // compliment/medication-error forms) request limit: 200 to fetch "all
  // active clients" in one page — raised from 100 so those queries stop
  // silently failing zod validation and rendering an empty dropdown once an
  // org has more than 100 clients.
  limit: z.number().min(1).max(200).default(20),
});

export const dateRangeSchema = z.object({
  from: z.date().optional(),
  to: z.date().optional(),
});

export const uuidSchema = z.string().min(1);

/**
 * Shared password strength rule for signup, password reset, and admin-set
 * temporary passwords — previously each of those independently required
 * only min(8) with no complexity check. 12 chars + at least one letter and
 * one digit is a modest floor, not full entropy scoring; raise here if
 * that's ever revisited; keep all three call sites on this one schema so
 * they can't drift out of sync again.
 */
export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[a-zA-Z]/, "Password must include at least one letter")
  .regex(/[0-9]/, "Password must include at least one number");

/** Optional email that also accepts an empty string (form fields cleared by the user). */
export const optionalEmailSchema = z.string().email().optional().or(z.literal(""));

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
