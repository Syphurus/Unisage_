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

  return {
    subjects: data?.data ?? [],
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

  return {
    subject: data?.data ?? null,
    isLoading,
    isError: error,
    mutate,
  };
}
