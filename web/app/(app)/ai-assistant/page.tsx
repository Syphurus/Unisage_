"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send } from "lucide-react";

const actions = [
  "Concept Synthesis",
  "Knowledge Retrieval",
  "Cloud Architecture",
  "Protocol Mapping",
];

export default function AiAssistantPage() {
  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_240px] gap-4">
      <main className="rounded-2xl border border-[#1E3550] bg-[#0D1B2A] text-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase font-bold tracking-[0.08em] text-[#A7C8E8]">
            AI Assistant
          </p>
          <Badge className="bg-[#12304A] text-[#C7E7FF] border-0">
            Live Content: Data Structures
          </Badge>
        </div>

        <div>
          <h1 className="text-[32px] font-bold leading-tight">
            Welcome back, Curator.
            <br />
            How shall we refine your knowledge today?
          </h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((name) => (
            <Card
              key={name}
              className="bg-[#102338] border-[#28415D] text-white"
            >
              <CardContent className="p-3 flex items-center gap-2">
                <Bot className="h-4 w-4 text-[#00B4A6]" />
                <p className="text-[13px] font-medium">{name}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="rounded-xl border border-[#28415D] bg-[#112337] p-4 min-h-[260px] space-y-3">
          <div className="flex justify-end">
            <div className="max-w-[70%] rounded-xl bg-[#0B1A2A] px-3 py-2 text-[13px]">
              Can you help me summarize the difference between TCP and UDP?
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="h-7 w-7 rounded-full bg-[#E2EAF8] text-[#0D1B2A] inline-flex items-center justify-center text-[11px] font-bold">
              AI
            </div>
            <div className="max-w-[78%] rounded-xl bg-white text-[#0D1B2A] px-3 py-2 text-[13px]">
              TCP is connection-oriented and reliable, while UDP is faster with
              lower overhead and no guaranteed delivery.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Input placeholder="Ask the AI curator..." className="bg-white" />
          <Button className="h-10 w-10 p-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="success" className="w-fit">
          Start Study Session
        </Button>
      </main>

      <aside className="space-y-3">
        <Card className="bg-[#0D1B2A] text-white border-[#1E3550]">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase font-bold tracking-[0.08em] text-[#A7C8E8]">
              Live Resources
            </p>
            <div className="mt-2 space-y-2 text-[12px]">
              <div className="rounded-lg border border-[#28415D] bg-[#102338] p-2">
                Key Findings: TCP reliability overhead in high-latency links.
              </div>
              <div className="rounded-lg border border-[#28415D] bg-[#102338] p-2">
                Lecture Report: Unit 4 coverage 68% complete.
              </div>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
