"use client";

import useSWR from "swr";
import { apiClient, type ApiResponse } from "@/lib/api";

/* ─── Types ─────────────────────────────────────────── */

export interface Subject {
  id: string;
  name: string;
  code: string;
  year: number;
  semester: number;
  credits: number | null;
  description: string | null;
  predictorVisible?: boolean;
  createdAt: string;
}

export interface SubjectWithUnits extends Subject {
  units: Unit[];
}

export interface Unit {
  id: string;
  unitNumber: number;
  title: string;
  description: string | null;
  orderIndex: number;
  createdAt?: string;
}

/* ─── Fetcher ───────────────────────────────────────── */

const fetcher = <T>(url: string) => apiClient<T>(url).then((r) => r);

function normalizeSubject(raw: any): Subject {
  return {
    id: raw.id,
    name: raw.name,
    code: raw.code,
    year: raw.year,
    semester: raw.semester,
    credits: raw.credits,
    description: raw.description,
    predictorVisible: raw.predictorVisible ?? raw.predictor_visible,
    createdAt: raw.createdAt ?? raw.created_at,
  };
}

/* ─── Hooks ─────────────────────────────────────────── */

export function useSubjects(year?: number, semester?: number, page = 1) {
  const params = new URLSearchParams();
  params.set("year", year ? String(year) : "all");
  params.set("semester", semester ? String(semester) : "all");
  params.set("page", String(page));
  params.set("limit", "20");

  const key = `/subjects?${params.toString()}`;

  const { data, error, mutate, isLoading } = useSWR<ApiResponse<Subject[]>>(
    key,
    fetcher,
    { revalidateOnFocus: false }
  );

  const subjects = Array.isArray(data?.data)
    ? data.data.map((subject) => normalizeSubject(subject))
    : [];

  return {
    subjects,
    pagination: data?.pagination,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useSubject(id: string) {
  const { data, error, mutate, isLoading } = useSWR<
    ApiResponse<SubjectWithUnits>
  >(id ? `/subjects/${id}` : null, fetcher, {
    revalidateOnFocus: false,
  });

  const subject = data?.data ? normalizeSubject(data.data) : null;

  return {
    subject,
    isLoading,
    isError: error,
    mutate,
  };
}
