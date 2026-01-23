export interface Project {
  id: string;
  title: string;
  description: string;
  meta: string;
  href: string;
  github?: string;
  image: string;
  external?: boolean;
}

export interface Principle {
  id: string;
  title: string;
  description: string;
}

export const projects: Project[] = [
  {
    id: "unisage",
    title: "Unisage",
    description:
      "A university management system built for scale. Chose a modular architecture that reduced deployment complexity by 60%.",
    meta: "Lead Engineer · 2025 · Systems Design",
    href: "#",
    github: "https://github.com/sharavtalmale/unisage",
    image: "/work/unisage.jpg",
  },
  {
    id: "cfe",
    title: "CFE Platform",
    description:
      "Internal tooling for financial operations. Prioritized developer experience and long-term maintainability over feature velocity.",
    meta: "Full Stack · 2024 · Enterprise",
    href: "#",
    github: "https://github.com/sharavtalmale/cfe",
    image: "/work/cfe.jpg",
  },
  {
    id: "portfolio",
    title: "This Portfolio",
    description:
      "A deliberate exercise in restraint. Every element justified, nothing decorative.",
    meta: "Design + Engineering · 2026 · Personal",
    href: "#",
    github: "https://github.com/sharavtalmale/portfolio",
    image: "/work/portfolio.jpg",
  },
];

export const principles: Principle[] = [
  {
    id: "correctness",
    title: "Correctness before cleverness",
    description:
      "I don't accept solutions that merely appear to work. If behavior isn't predictable under edge cases, the work isn't finished.\n\nI'd rather reset and rebuild than ship fragile patches. Reliability is not negotiable.",
  },
  {
    id: "truth",
    title: "One source of truth",
    description:
      "State duplication is technical debt disguised as convenience. I design systems around a single, explicit authority even when it means writing less \"clever\" code.\n\nClear ownership beats implicit coupling every time.",
  },
  {
    id: "constraints",
    title: "Constraints create clarity",
    description:
      "I work best when boundaries are explicit: desktop vs mobile, static vs interactive, client vs server.\n\nAmbiguous responsibility produces brittle systems. Clear constraints produce durable ones.",
  },
  {
    id: "readable",
    title: "Readable code outlives optimized code",
    description:
      "I optimize for the engineer reading this code six months from now. If intent isn't obvious, the implementation isn't done.\n\nCleanups that reduce cognitive load matter more than feature velocity.",
  },
  {
    id: "compound",
    title: "Systems that compound",
    description:
      "I'm comfortable investing early effort into foundations that scale with time. That often looks slower in the short term and pays off decisively later.\n\nI optimize for leverage, not theatrics.",
  },
];

export const contact = {
  email: "sharav.talmale@gmail.com",
  github: "https://github.com/sharavtalmale",
  linkedin: "https://linkedin.com/in/sharavtalmale",
};
