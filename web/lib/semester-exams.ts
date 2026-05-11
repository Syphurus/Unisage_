import type { Subject } from "@/lib/types";

const SEM_4_CORE_PATTERNS = [
  /(^|\W)oops?(\W|$)/i,
  /object[-\s]?oriented/i,
  /software\s+engineering/i,
  /linear\s+algebra/i,
  /(^|\W)dcn(\W|$)/i,
  /data\s+communication/i,
  /computer\s+networks?/i,
];

const SEM_4_CORE_CODES = new Set([
  "CSEG1044",
  "MATH2059",
]);

const PROGRAM_CODE_ALIASES: Record<string, string[]> = {
  AIML: ["AI", "AIML", "CSAI"],
  AI_ML: ["AI", "AIML", "CSAI"],
  DEVOPS: ["DV", "CSDV"],
  CLOUDINFRA: ["CLOUD", "VT", "CSVT"],
  CLOUD_INFRA: ["CLOUD", "VT", "CSVT"],
  FULLSTACK: ["FS", "CSFS"],
  FULL_STACK: ["FS", "CSFS"],
  CYBERFORENSICS: ["SF", "CSSF", "IS", "CSIS"],
  CYBER_FORENSICS: ["SF", "CSSF", "IS", "CSIS"],
  BIGDATA: ["BD", "CSBD"],
  BIG_DATA: ["BD", "CSBD"],
  DATASCIENCE: ["DS", "CSDS"],
  DATA_SCIENCE: ["DS", "CSDS"],
  IOTEMBEDDED: ["IOT", "CSIS"],
  IOT_EMBEDDED: ["IOT", "CSIS"],
  GRAPHICSGAMING: ["GG", "CSGG"],
  GRAPHICS_GAMING: ["GG", "CSGG"],
  AI: ["AI", "AIML", "CSAI"],
  CSAI: ["AI", "AIML", "CSAI"],
  DS: ["DS", "CSDS"],
  CSDS: ["DS", "CSDS"],
  FS: ["FS", "CSFS"],
  CSFS: ["FS", "CSFS"],
  SF: ["SF", "CSSF"],
  CSSF: ["SF", "CSSF"],
  IS: ["IS", "CSIS"],
  CSIS: ["IS", "CSIS"],
  VT: ["VT", "CSVT"],
  CSVT: ["VT", "CSVT"],
  DV: ["DV", "CSDV"],
  CSDV: ["DV", "CSDV"],
  GG: ["GG", "CSGG"],
  CSGG: ["GG", "CSGG"],
  BD: ["BD", "CSBD"],
  CSBD: ["BD", "CSBD"],
};

const SPECIALIZATION_NAME_PATTERNS: Record<string, RegExp[]> = {
  AIML: [/artificial intelligence/i, /machine learning/i],
  AI_ML: [/artificial intelligence/i, /machine learning/i],
  DEVOPS: [/devops/i],
  CLOUDINFRA: [/cloud/i, /infrastructure/i],
  CLOUD_INFRA: [/cloud/i, /infrastructure/i],
  FULLSTACK: [/full\s*stack/i, /frontend/i, /front[-\s]?end/i],
  FULL_STACK: [/full\s*stack/i, /frontend/i, /front[-\s]?end/i],
  CYBERFORENSICS: [/cyber/i, /forensics/i, /security/i],
  CYBER_FORENSICS: [/cyber/i, /forensics/i, /security/i],
  BIGDATA: [/big\s*data/i],
  BIG_DATA: [/big\s*data/i],
  DATASCIENCE: [/data\s*science/i],
  DATA_SCIENCE: [/data\s*science/i],
  IOTEMBEDDED: [/iot/i, /embedded/i],
  IOT_EMBEDDED: [/iot/i, /embedded/i],
  GRAPHICSGAMING: [/graphics/i, /gaming/i],
  GRAPHICS_GAMING: [/graphics/i, /gaming/i],
};

function normalize(value?: string | null) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function normalizedSubjectCode(subject: Subject) {
  return normalize(subject.code).replace(/[0-9]+P?$/, "");
}

export function isSem4CoreSubject(subject: Subject) {
  const code = normalize(subject.code).replace(/_[0-9]+$/, "");
  if (SEM_4_CORE_CODES.has(code)) return true;

  const searchable = `${subject.name || ""} ${subject.code || ""}`;
  return SEM_4_CORE_PATTERNS.some((pattern) => pattern.test(searchable));
}

function programTokens(specialization?: string | null, branchCode?: string | null) {
  const program = normalize(specialization);
  const branch = normalize(branchCode);
  if (!program && !branch) return [];

  const bySpecialization = PROGRAM_CODE_ALIASES[program];
  if (bySpecialization) return bySpecialization;
  const exact = PROGRAM_CODE_ALIASES[branch];
  if (exact) return exact;

  return [branch, branch.replace(/^CS/, "")].filter(Boolean);
}

function matchesProgram(
  subject: Subject,
  specialization?: string | null,
  branchCode?: string | null,
) {
  const code = normalizedSubjectCode(subject);
  const normalizedSpecialization = normalize(specialization);
  const patterns = SPECIALIZATION_NAME_PATTERNS[normalizedSpecialization] || [];
  const matchesName = patterns.some((pattern) => pattern.test(subject.name));

  return (
    matchesName ||
    programTokens(specialization, branchCode).some((token) => code.startsWith(token))
  );
}

function isSpecializationSubject(subject: Subject) {
  return Object.keys(SPECIALIZATION_NAME_PATTERNS).some((specialization) =>
    matchesProgram(subject, specialization),
  );
}

function hasSupportedSpecialization(
  subjects: Subject[],
  specialization?: string | null,
  branchCode?: string | null,
) {
  if (!specialization) return false;
  return subjects.some((subject) =>
    !isSem4CoreSubject(subject) && matchesProgram(subject, specialization, branchCode),
  );
}

export function examSubjectsForStudent(
  subjects: Subject[],
  specialization?: string | null,
  branchCode?: string | null,
) {
  const isOnlySem4 = subjects.length > 0 && subjects.every((s) => s.semester === 4);
  if (!isOnlySem4) return subjects;

  const requiredSubjects = subjects.filter(isSem4CoreSubject);
  const specializationPool = subjects.filter((subject) => !isSem4CoreSubject(subject));
  if (specializationPool.length === 0) return requiredSubjects.slice(0, 5);

  const selectedSpecialization =
    hasSupportedSpecialization(subjects, specialization, branchCode) &&
    specializationPool.find((subject) =>
      matchesProgram(subject, specialization, branchCode),
    );

  if (!selectedSpecialization) return requiredSubjects.slice(0, 5);

  return [...requiredSubjects, selectedSpecialization].slice(0, 5);
}
