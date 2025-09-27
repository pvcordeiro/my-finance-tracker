import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const entrySchema = z.object({
  name: z.string().min(1, "Entry name is required").max(255),
  type: z.enum(["income", "expense"]),
  amounts: z.union([
    z.array(z.number()).length(12, "Amounts must be an array of 12 numbers"),
    z.string().refine((val: string) => {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) && parsed.length === 12;
      } catch {
        return false;
      }
    }, "Amounts must be a valid JSON array of 12 numbers"),
  ]),
});

export const bankAmountSchema = z.object({
  amount: z.number().min(0, "Bank amount cannot be negative"),
});

export const userIdSchema = z.object({
  userId: z
    .string()
    .transform((val: string) => parseInt(val, 10))
    .pipe(z.number().positive()),
});

export const adminLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const deleteUserSchema = z.object({
  userId: z.string().regex(/^\d+$/, "User ID must be a number"),
});

export const settingsSchema = z.object({
  allow_registration: z.boolean(),
});
