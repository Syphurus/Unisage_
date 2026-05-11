import type { Subject } from "@/lib/types";

const EXAM_DATES_BY_CODE: Record<string, string> = {
  // SOCS II Semester End Semester Examination - May 2026
  CSEG1043: "2026-05-12",
  CSEG1021: "2026-05-14",
  CSEG1039: "2026-05-14",
  CSEG1013: "2026-05-14",
  MATH1066: "2026-05-18",
  MATH1067: "2026-05-18",
  ECEG1012: "2026-05-18",
  CSEG1050: "2026-05-18",
  CSEG2073: "2026-05-20",
  CSEG1045: "2026-05-20",
  MATH1065: "2026-05-20",
  MATH1075: "2026-05-20",
  CSAI2018: "2026-05-22",
  MATH1076: "2026-05-22",
  PHYS1036: "2026-05-26",

  // SOCS IV Semester End Semester Examination - May 2026
  CSEG1044: "2026-05-13",
  CSEG2061: "2026-05-13",
  CSEG2064: "2026-05-15",
  CSEG2014: "2026-05-15",
  CSEG2060: "2026-05-19",
  MATH2059: "2026-05-19",
  CSEG2065: "2026-05-21",
  CSDS2001P: "2026-05-25",
  CSDS2002P: "2026-05-25",
  CSAI2016P: "2026-05-25",
  CSAI2017P: "2026-05-25",
  CSFS2003P: "2026-05-25",
  CSFS2004P: "2026-05-25",
  CSSF2015P: "2026-05-25",
  CSIS2013P: "2026-05-25",
  CSVT2011P: "2026-05-25",
  CSDV2010P: "2026-05-25",
  CSGG2012P: "2026-05-25",
  CSBD2011P: "2026-05-25",
};

const SEM_4_ELECTIVE_DATE = "2026-05-25";

function normalizeSubjectCode(code?: string | null) {
  return String(code || "")
    .toUpperCase()
    .replace(/_[0-9]+$/, "")
    .trim();
}

export function examDateForSubject(subject: Subject): string | null {
  const code = normalizeSubjectCode(subject.code);
  if (EXAM_DATES_BY_CODE[code]) return EXAM_DATES_BY_CODE[code];

  const name = subject.name.toLowerCase();
  if (
    subject.semester === 4 &&
    (name.includes("applied machine learning") ||
      name.includes("fundamentals of data science") ||
      name.includes("frontend development") ||
      name.includes("cyber security") ||
      name.includes("cloud computing") ||
      name.includes("devops") ||
      name.includes("big data") ||
      name.includes("iot") ||
      name.includes("graphics"))
  ) {
    return SEM_4_ELECTIVE_DATE;
  }

  return null;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function examMeta(dateIso: string | null) {
  if (!dateIso) {
    return {
      sortTime: Number.POSITIVE_INFINITY,
      label: "DATE TBA",
      urgency: "Scheduled",
      daysUntil: null,
    };
  }

  const examDate = startOfLocalDay(new Date(`${dateIso}T00:00:00`));
  const today = startOfLocalDay(new Date());
  const days = Math.ceil(
    (examDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );
  const dateLabel = examDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  if (days < 0) {
    return {
      sortTime: Number.MAX_SAFE_INTEGER,
      label: `${dateLabel} · DONE`,
      urgency: "Done",
      daysUntil: days,
    };
  }
  if (days === 0) {
    return {
      sortTime: examDate.getTime(),
      label: `TODAY · ${dateLabel}`,
      urgency: "Critical",
      daysUntil: days,
    };
  }
  if (days === 1) {
    return {
      sortTime: examDate.getTime(),
      label: `TOMORROW · ${dateLabel}`,
      urgency: "Critical",
      daysUntil: days,
    };
  }

  return {
    sortTime: examDate.getTime(),
    label: `IN ${days} DAYS · ${dateLabel}`,
    urgency: days <= 7 ? "Critical" : days <= 14 ? "In review" : "Scheduled",
    daysUntil: days,
  };
}
