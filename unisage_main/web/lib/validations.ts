import { z } from "zod";

const semesterRangeByYear = (year: number) => {
  const start = Math.max(1, (year - 1) * 2 + 1);
  return [start, Math.min(8, start + 1)] as const;
};

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const signupSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be under 100 characters"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    collegeCode: z.string().min(1, "College is required"),
    branchCode: z.string().min(1, "Branch is required"),
    year: z
      .number({ required_error: "Year is required" })
      .min(1, "Year must be between 1 and 4")
      .max(4, "Year must be between 1 and 4"),
    semester: z
      .number({ required_error: "Semester is required" })
      .min(1, "Semester must be between 1 and 8")
      .max(8, "Semester must be between 1 and 8"),
    enrollmentNumber: z.string().min(1, "Enrollment number is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      const [minSemester, maxSemester] = semesterRangeByYear(data.year);
      return data.semester >= minSemester && data.semester <= maxSemester;
    },
    {
      message: "Select the semester for your year",
      path: ["semester"],
    }
  );

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
