"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSubjects, Subject } from "@/lib/hooks/useSubjects";
import { Plus, Search } from "lucide-react";
import { yearLabel, semesterLabel } from "@/lib/utils";

export default function SubjectsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [yearFilter, setYearFilter] = useState<number | undefined>();
  const [semesterFilter, setSemesterFilter] = useState<number | undefined>();
  const [search, setSearch] = useState("");

  const { subjects, pagination, isLoading } = useSubjects(
    yearFilter,
    semesterFilter,
    page
  );

  const filtered = search
    ? subjects.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.code.toLowerCase().includes(search.toLowerCase())
      )
    : subjects;

  const columns: Column<Subject>[] = [
    {
      key: "code",
      header: "Code",
      render: (item) => (
        <span className="font-mono text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-1 rounded">
          {item.code}
        </span>
      ),
    },
    {
      key: "name",
      header: "Subject Name",
      render: (item) => (
        <div>
          <p className="font-medium text-gray-900">{item.name}</p>
          {item.description && (
            <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
              {item.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "year",
      header: "Year",
      render: (item) => <Badge variant="outline">{yearLabel(item.year)}</Badge>,
    },
    {
      key: "semester",
      header: "Semester",
      render: (item) => (
        <Badge variant="secondary">{semesterLabel(item.semester)}</Badge>
      ),
    },
    {
      key: "credits",
      header: "Credits",
      render: (item) => (
        <span className="text-gray-600">{item.credits || "—"}</span>
      ),
    },
  ];

  return (
    <div>
      <TopBar title="Subjects">
        <Link href="/dashboard/subjects/new">
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Subject
          </Button>
        </Link>
      </TopBar>

      <div className="p-6 space-y-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Subjects" },
          ]}
        />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search subjects..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select
            value={yearFilter ? String(yearFilter) : "all"}
            onValueChange={(v) =>
              setYearFilter(v === "all" ? undefined : Number(v))
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              <SelectItem value="1">1st Year</SelectItem>
              <SelectItem value="2">2nd Year</SelectItem>
              <SelectItem value="3">3rd Year</SelectItem>
              <SelectItem value="4">4th Year</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={semesterFilter ? String(semesterFilter) : "all"}
            onValueChange={(v) =>
              setSemesterFilter(v === "all" ? undefined : Number(v))
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Semesters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Semesters</SelectItem>
              <SelectItem value="1">Semester 1</SelectItem>
              <SelectItem value="2">Semester 2</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={filtered}
          loading={isLoading}
          emptyTitle="No subjects found"
          emptyDescription="Create your first subject to get started."
          page={page}
          totalPages={pagination?.totalPages}
          onPageChange={setPage}
          onRowClick={(item) => router.push(`/dashboard/subjects/${item.id}`)}
        />
      </div>
    </div>
  );
}
