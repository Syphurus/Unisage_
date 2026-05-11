export const SPECIALIZATIONS = [
  { code: "AI_ML", label: "Artificial Intelligence & Machine Learning (AI/ML)" },
  { code: "DEVOPS", label: "DevOps" },
  { code: "CLOUD_INFRA", label: "Cloud & Infrastructure" },
  { code: "FULL_STACK", label: "Full Stack Development" },
  {
    code: "CYBER_FORENSICS",
    label: "Cyber Security & Digital Forensics",
  },
  { code: "BIG_DATA", label: "Big Data" },
  { code: "DATA_SCIENCE", label: "Data Science" },
  { code: "IOT_EMBEDDED", label: "IoT & Embedded Systems" },
  { code: "GRAPHICS_GAMING", label: "Graphics & Gaming" },
] as const;

export type SpecializationCode = (typeof SPECIALIZATIONS)[number]["code"];

export function specializationLabel(code?: string | null) {
  return SPECIALIZATIONS.find((item) => item.code === code)?.label || code || "";
}
