"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const quizGroups = [
  {
    title: "Computer Networks",
    count: 4,
    cards: [
      {
        level: "INTRO",
        title: "TCP/IP Protocol Suite",
        desc: "Core transport principles and packet flow.",
        q: 25,
        t: "30 Min",
      },
      {
        level: "INTERMEDIATE",
        title: "Network Security Fundamentals",
        desc: "Encryption and layered defense concepts.",
        q: 20,
        t: "25 Min",
      },
      {
        level: "ADVANCED",
        title: "HTTP & Web Sockets",
        desc: "Protocol evolution and realtime traffic.",
        q: 18,
        t: "22 Min",
      },
      {
        level: "INTERMEDIATE",
        title: "Wireless Communication",
        desc: "802.11 standards and reliability constraints.",
        q: 20,
        t: "28 Min",
      },
    ],
  },
  {
    title: "Database Management",
    count: 3,
    cards: [
      {
        level: "INTRO",
        title: "SQL Optimization",
        desc: "Query planning and indexing basics.",
        q: 16,
        t: "20 Min",
      },
      {
        level: "ADVANCED",
        title: "Schema Design",
        desc: "Normalization and workload-driven choices.",
        q: 22,
        t: "28 Min",
      },
      {
        level: "INTERMEDIATE",
        title: "ACID Properties",
        desc: "Consistency and transaction semantics.",
        q: 14,
        t: "18 Min",
      },
    ],
  },
];

const performance = [
  { name: "Discrete Mathematics", score: 95 },
  { name: "Algorithms Design", score: 78 },
  { name: "Software Engineering", score: 64 },
];

function badgeVariant(level: string) {
  if (level === "ADVANCED") return "default" as const;
  if (level === "INTERMEDIATE") return "secondary" as const;
  return "warning" as const;
}

export default function QuizzesPage() {
  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px] gap-6">
      <main className="space-y-6">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] font-bold text-[#00B4A6]">
              Knowledge Assessment
            </p>
            <h1 className="text-[32px] font-bold text-[#0D1B2A] leading-tight">
              Active Quizzes
            </h1>
            <p className="text-[13px] text-[#707891] mt-1">
              Measure your understanding through curated challenge modules.
            </p>
          </div>

          <div className="flex gap-2">
            <Card>
              <CardContent className="p-3 min-w-[112px]">
                <p className="text-[10px] uppercase font-bold text-[#707891]">
                  Avg Score
                </p>
                <p className="text-[26px] font-bold text-[#0D1B2A]">84%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 min-w-[112px]">
                <p className="text-[10px] uppercase font-bold text-[#707891]">
                  Completed
                </p>
                <p className="text-[26px] font-bold text-[#0D1B2A]">42</p>
              </CardContent>
            </Card>
          </div>
        </header>

        {quizGroups.map((group) => (
          <section key={group.title} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[20px] font-semibold text-[#0D1B2A]">
                {group.title}
              </h2>
              <span className="text-[12px] text-[#707891]">
                {group.count} Assessments
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {group.cards.slice(0, 2).map((card) => (
                <Card key={card.title}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={badgeVariant(card.level)}>
                        {card.level}
                      </Badge>
                      <span className="text-[10px] text-[#707891]">🎓</span>
                    </div>
                    <h3 className="text-[16px] font-semibold text-[#0D1B2A]">
                      {card.title}
                    </h3>
                    <p className="text-[13px] text-[#707891] mt-1 min-h-[36px]">
                      {card.desc}
                    </p>
                    <p className="text-[11px] text-[#707891] mt-2">
                      {card.q} Questions • {card.t}
                    </p>
                    <Button className="w-full mt-3">Start Quiz</Button>
                  </CardContent>
                </Card>
              ))}

              <Card className="bg-[#0D1B2A] text-white md:row-span-2">
                <CardContent className="p-4 h-full flex flex-col">
                  <Badge className="bg-white/10 text-white">Challenge</Badge>
                  <h3 className="text-[24px] font-bold leading-tight mt-2">
                    Mastering OSI Layers & Subnetting
                  </h3>
                  <p className="text-[12px] text-white/75 mt-2">
                    Comprehensive review across layered communication models.
                  </p>
                  <Button className="mt-auto" variant="success">
                    Begin Challenge
                  </Button>
                </CardContent>
              </Card>

              {group.cards.slice(2).map((card) => (
                <Card key={card.title}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={badgeVariant(card.level)}>
                        {card.level}
                      </Badge>
                      <span className="text-[10px] text-[#707891]">⚙️</span>
                    </div>
                    <h3 className="text-[16px] font-semibold text-[#0D1B2A]">
                      {card.title}
                    </h3>
                    <p className="text-[13px] text-[#707891] mt-1 min-h-[36px]">
                      {card.desc}
                    </p>
                    <p className="text-[11px] text-[#707891] mt-2">
                      {card.q} Questions • {card.t}
                    </p>
                    <Button className="w-full mt-3">Start Quiz</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-[12px] font-semibold text-[#0D1B2A]">
                Recent Performance
              </p>
              <div className="mt-3 space-y-3">
                {performance.map((row) => (
                  <div key={row.name}>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-[#0D1B2A]">{row.name}</span>
                      <span className="text-[#0D1B2A] font-semibold">
                        {row.score}/100
                      </span>
                    </div>
                    <Progress value={row.score} className="mt-1" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 h-full flex flex-col justify-center">
              <p className="text-[10px] uppercase font-bold text-[#707891]">
                Total Study Time
              </p>
              <p className="text-[40px] font-bold text-[#0D1B2A] leading-none mt-1">
                18.4h
              </p>
              <a
                href="#"
                className="text-[12px] text-[#0D1B2A] font-medium mt-2"
              >
                View Detailed Report
              </a>
            </CardContent>
          </Card>
        </div>
      </main>

      <aside className="space-y-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] uppercase font-bold text-[#707891]">
              Weekly Goal
            </p>
            <p className="text-[14px] font-semibold text-[#0D1B2A] mt-1">
              12/15 Quizzes
            </p>
            <Progress value={80} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 text-[12px] text-[#707891] space-y-2">
            <p>⚙️ Settings</p>
            <p>↩ Logout</p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
