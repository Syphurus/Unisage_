const SEM_4_CORE_PATTERNS = [
  /(^|\W)oops?(\W|$)/i,
  /object[-\s]?oriented/i,
  /software\s+engineering/i,
  /linear\s+algebra/i,
  /(^|\W)dcn(\W|$)/i,
  /data\s+communication/i,
  /computer\s+networks?/i,
];

const SEM_4_CORE_CODES = new Set(["CSEG1044", "MATH2059"]);

const SPECIALIZATION_CODE_ALIASES = {
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
};

const SPECIALIZATION_NAME_PATTERNS = {
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

function normalize(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function normalizedSubjectCode(subject) {
  return normalize(subject.code).replace(/[0-9]+P?$/, "");
}

function isSem4CoreSubject(subject) {
  const code = normalize(subject.code).replace(/_[0-9]+$/, "");
  if (SEM_4_CORE_CODES.has(code)) return true;

  const searchable = `${subject.name || ""} ${subject.code || ""}`;
  return SEM_4_CORE_PATTERNS.some((pattern) => pattern.test(searchable));
}

function matchesSpecialization(subject, specialization) {
  const normalizedSpecialization = normalize(specialization);
  const patterns = SPECIALIZATION_NAME_PATTERNS[normalizedSpecialization] || [];
  const matchesName = patterns.some((pattern) => pattern.test(subject.name || ""));
  const code = normalizedSubjectCode(subject);
  const codeTokens = SPECIALIZATION_CODE_ALIASES[normalizedSpecialization] || [];

  return matchesName || codeTokens.some((token) => code.startsWith(token));
}

function isSpecializationSubject(subject) {
  return Object.keys(SPECIALIZATION_NAME_PATTERNS).some((specialization) =>
    matchesSpecialization(subject, specialization)
  );
}

function hasSupportedSpecialization(subjects, specialization) {
  if (!specialization) return false;
  return subjects.some(
    (subject) =>
      !isSem4CoreSubject(subject) && matchesSpecialization(subject, specialization)
  );
}

function examSubjectsForStudent(subjects, specialization) {
  const isOnlySem4 =
    subjects.length > 0 && subjects.every((subject) => subject.semester === 4);
  if (!isOnlySem4) return subjects;

  const requiredSubjects = subjects.filter(isSem4CoreSubject);
  const specializationPool = subjects.filter(
    (subject) => !isSem4CoreSubject(subject)
  );
  if (specializationPool.length === 0) return requiredSubjects.slice(0, 5);

  const selectedSpecialization =
    hasSupportedSpecialization(subjects, specialization) &&
    specializationPool.find((subject) =>
      matchesSpecialization(subject, specialization)
    );

  if (!selectedSpecialization) return requiredSubjects.slice(0, 5);

  return [...requiredSubjects, selectedSpecialization].slice(0, 5);
}

function filterSubjectsForStudent(subjects, user) {
  if (!user || Number(user.semester) < 4) {
    return subjects;
  }

  const semesterNumbers = subjects.map((subject) => Number(subject.semester));
  const isOnlySem4 =
    semesterNumbers.length > 0 && semesterNumbers.every((semester) => semester === 4);

  if (isOnlySem4) {
    return examSubjectsForStudent(subjects, user.specialization);
  }

  return subjects.filter(
    (subject) => {
      const semester = Number(subject.semester);
      if (semester < 4) return true;
      if (semester === 4) {
        return (
          isSem4CoreSubject(subject) ||
          matchesSpecialization(subject, user.specialization)
        );
      }

      return (
        !isSpecializationSubject(subject) ||
        matchesSpecialization(subject, user.specialization)
      );
    }
  );
}

function canAccessSubject(subject, user) {
  if (!subject) return false;
  if (!user || Number(user.semester) < 4) {
    return true;
  }

  const semester = Number(subject.semester);
  if (semester < 4 || isSem4CoreSubject(subject)) {
    return true;
  }

  if (!user.specialization) {
    return false;
  }

  if (semester === 4) {
    return matchesSpecialization(subject, user.specialization);
  }

  if (!isSpecializationSubject(subject)) {
    return true;
  }

  return matchesSpecialization(subject, user.specialization);
}

module.exports = {
  canAccessSubject,
  filterSubjectsForStudent,
};
