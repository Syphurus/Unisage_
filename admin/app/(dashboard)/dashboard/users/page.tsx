"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { api } from "@/lib/api";
import {
  adminPermissionOptions,
  canAccessSection,
  type AdminSection,
} from "@/lib/access";
import {
  Plus,
  Search,
  Shield,
  UserIcon,
  Trash2,
  Edit2,
  Users,
  UserRoundCheck,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { useAuth } from "@/lib/hooks/useAuth";

interface ManagedUser {
  id: string;
  fullName: string;
  email: string;
  role: "student" | "admin";
  permissions: string[];
  year: number | null;
  semester: number | null;
  enrollmentNumber: string | null;
  isActive: boolean;
  createdAt: string;
  lastActive: string | null;
}

type SectionKey = AdminSection;

type SectionState = {
  items: ManagedUser[];
  loading: boolean;
  page: number;
  totalPages: number;
  search: string;
};

type FormState = {
  fullName: string;
  email: string;
  password: string;
  year: string;
  semester: string;
  enrollmentNumber: string;
  isActive: boolean;
  permissions: string[];
};

const INITIAL_SECTION_STATE: Record<SectionKey, SectionState> = {
  users: { items: [], loading: true, page: 1, totalPages: 1, search: "" },
  team: { items: [], loading: true, page: 1, totalPages: 1, search: "" },
};

const SECTION_META: Record<
  SectionKey,
  {
    title: string;
    singular: string;
    subtitle: string;
    icon: ComponentType<{ className?: string }>;
    endpoint: string;
    permission: string;
  }
> = {
  users: {
    title: "Users",
    singular: "User",
    subtitle: "Create, edit, and remove student accounts.",
    icon: Users,
    endpoint: "/admin/users",
    permission: "users.manage",
  },
  team: {
    title: "Team",
    singular: "Team Member",
    subtitle: "Manage admin team members and page permissions.",
    icon: UserRoundCheck,
    endpoint: "/admin/team",
    permission: "team.manage",
  },
};

const PERMISSION_HELPERS: Record<string, string> = {
  "dashboard.view": "Access dashboard overview",
  "subjects.manage": "Create and edit subjects",
  "content.manage": "Create and edit content",
  "users.manage": "Manage student accounts",
  "team.manage": "Manage team members and permissions",
  "analytics.view": "View analytics",
  "coupons.manage": "Create and regulate coupons",
  "payments.review": "Review payments",
  "payments.revoke": "Revoke payments",
};

function getDefaultForm(section: SectionKey): FormState {
  return {
    fullName: "",
    email: "",
    password: "",
    year: "",
    semester: "",
    enrollmentNumber: "",
    isActive: true,
    permissions: section === "team" ? [] : [],
  };
}

export default function UsersPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<SectionKey>("users");
  const [sections, setSections] = useState(INITIAL_SECTION_STATE);
  const [form, setForm] = useState<FormState>(getDefaultForm("users"));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    section: SectionKey;
    user: ManagedUser;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const allowedSections = useMemo(
    () =>
      (["users", "team"] as SectionKey[]).filter((section) =>
        canAccessSection(user?.permissions, section)
      ),
    [user?.permissions]
  );

  useEffect(() => {
    if (!allowedSections.includes(activeSection)) {
      setActiveSection(allowedSections[0] || "users");
    }
  }, [activeSection, allowedSections]);

  const updateSection = (section: SectionKey, patch: Partial<SectionState>) => {
    setSections((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...patch },
    }));
  };

  const startEdit = (item: ManagedUser) => {
    const section = item.role === "admin" ? "team" : "users";
    setActiveSection(section);
    setEditingId(item.id);
    setForm({
      fullName: item.fullName,
      email: item.email,
      password: "",
      year: item.year ? String(item.year) : "",
      semester: item.semester ? String(item.semester) : "",
      enrollmentNumber: item.enrollmentNumber || "",
      isActive: item.isActive,
      permissions: item.permissions || [],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loadSection = async (section: SectionKey) => {
    updateSection(section, { loading: true });
    try {
      const state = sections[section];
      const res = await api.get<ManagedUser[]>(
        `${SECTION_META[section].endpoint}?page=${state.page}&limit=20`
      );

      if (res.success && res.data) {
        updateSection(section, {
          items: res.data as ManagedUser[],
          totalPages: res.pagination?.totalPages || 1,
        });
      }
    } catch {
      toast.error(`Failed to load ${section}`);
    } finally {
      updateSection(section, { loading: false });
    }
  };

  useEffect(() => {
    if (allowedSections.includes("users")) {
      loadSection("users");
    }
  }, [sections.users.page, allowedSections.join(",")]);

  useEffect(() => {
    if (allowedSections.includes("team")) {
      loadSection("team");
    }
  }, [sections.team.page, allowedSections.join(",")]);

  useEffect(() => {
    setForm(getDefaultForm(activeSection));
    setEditingId(null);
  }, [activeSection]);

  const currentSection = sections[activeSection];
  const filteredItems = useMemo(() => {
    const search = currentSection.search.trim().toLowerCase();
    if (!search) return currentSection.items;
    return currentSection.items.filter(
      (item) =>
        item.fullName.toLowerCase().includes(search) ||
        item.email.toLowerCase().includes(search)
    );
  }, [currentSection.items, currentSection.search]);

  const columns: Column<ManagedUser>[] = useMemo(() => {
    const baseColumns: Column<ManagedUser>[] = [
      {
        key: "fullName",
        header: "Name",
        render: (item) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold text-sm">
              {item.fullName?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div>
              <p className="font-medium text-gray-900">{item.fullName}</p>
              <p className="text-xs text-gray-500">{item.email}</p>
            </div>
          </div>
        ),
      },
      {
        key: "role",
        header: "Role",
        render: (item) => (
          <Badge
            variant={item.role === "admin" ? "default" : "secondary"}
            className="gap-1"
          >
            {item.role === "admin" ? (
              <Shield className="h-3 w-3" />
            ) : (
              <UserIcon className="h-3 w-3" />
            )}
            {item.role}
          </Badge>
        ),
      },
      {
        key: "joined",
        header: "Joined",
        render: (item) => (
          <span className="text-gray-500 text-sm">
            {formatDateTime(item.createdAt)}
          </span>
        ),
      },
    ];

    if (activeSection === "users") {
      baseColumns.splice(2, 0, {
        key: "year",
        header: "Year / Semester",
        render: (item) => (
          <span className="text-sm text-gray-600">
            {item.year ? `Y${item.year}` : "—"}
            {item.semester ? ` • S${item.semester}` : ""}
          </span>
        ),
      });
    } else {
      baseColumns.splice(2, 0, {
        key: "permissions",
        header: "Permissions",
        render: (item) => (
          <div className="flex flex-wrap gap-1">
            {item.permissions.length > 0 ? (
              item.permissions.map((permission) => (
                <Badge key={permission} variant="outline" className="text-xs">
                  {permission.replace(".", " ")}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-gray-400">No permissions</span>
            )}
          </div>
        ),
      });
    }

    baseColumns.push({
      key: "actions",
      header: "",
      className: "w-24",
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-500 hover:text-brand-700"
            onClick={(e) => {
              e.stopPropagation();
              startEdit(item);
            }}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget({
                section: item.role === "admin" ? "team" : "users",
                user: item,
              });
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    });

    return baseColumns;
  }, [activeSection]);

  const resetForm = () => {
    setEditingId(null);
    setForm(getDefaultForm(activeSection));
  };

  const handleSubmit = async () => {
    const section = activeSection;
    const endpoint = editingId
      ? `${SECTION_META[section].endpoint}/${editingId}`
      : SECTION_META[section].endpoint;

    if (!form.fullName.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    if (!editingId && !form.password.trim()) {
      toast.error("Password is required for new accounts");
      return;
    }

    if (section === "users" && (!form.year || !form.semester)) {
      toast.error("Year and semester are required for users");
      return;
    }

    if (section === "team" && form.permissions.length === 0) {
      toast.error("Select at least one permission for a team member");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        role: section === "team" ? "admin" : "student",
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password.trim() || undefined,
        year: section === "users" ? Number(form.year) : null,
        semester: section === "users" ? Number(form.semester) : null,
        enrollmentNumber: form.enrollmentNumber.trim() || null,
        isActive: form.isActive,
        permissions: section === "team" ? form.permissions : [],
      };

      const response = editingId
        ? await api.put(endpoint, payload)
        : await api.post(endpoint, payload);

      if (!response.success) {
        toast.error(response.error?.message || "Failed to save user");
        return;
      }

      toast.success(
        `${section === "team" ? "Team member" : "User"} ${
          editingId ? "updated" : "created"
        }`
      );
      await loadSection(section);
      resetForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save user"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await api.delete(
        `/admin/${deleteTarget.section}/${deleteTarget.user.id}`
      );
      if (!response.success) {
        toast.error(response.error?.message || "Failed to delete user");
        return;
      }

      toast.success("Deleted successfully");
      await loadSection(deleteTarget.section);
      if (editingId === deleteTarget.user.id) {
        resetForm();
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const currentMeta = SECTION_META[activeSection];
  const CurrentIcon = currentMeta.icon;

  if (allowedSections.length === 0) {
    return (
      <div>
        <TopBar title="Users" />
        <div className="p-6">
          <Breadcrumb
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Users" },
            ]}
          />
          <Card className="mt-6">
            <CardContent className="py-10 text-center text-gray-500">
              You do not have permission to access user management sections.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Users & Team" />

      <div className="p-6 space-y-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Users" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-3">
          {allowedSections.map((section) => (
            <Button
              key={section}
              variant={activeSection === section ? "default" : "outline"}
              onClick={() => setActiveSection(section)}
            >
              {SECTION_META[section].title}
            </Button>
          ))}
        </div>

        <Card className="border-[rgb(var(--border))] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <CurrentIcon className="h-5 w-5 text-brand-600" />
                {editingId
                  ? `Edit ${currentMeta.singular}`
                  : `Create ${currentMeta.singular}`}
              </CardTitle>
              <p className="mt-1 text-sm text-gray-500">
                {currentMeta.subtitle}
              </p>
            </div>
            {editingId && (
              <Button variant="outline" onClick={resetForm}>
                Cancel edit
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full name" required>
                <Input
                  value={form.fullName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, fullName: e.target.value }))
                  }
                  placeholder="Enter full name"
                />
              </Field>
              <Field label="Email" required>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="Enter email address"
                />
              </Field>
              <Field
                label={
                  editingId ? "Password (leave blank to keep)" : "Password"
                }
                required={!editingId}
              >
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  placeholder={
                    editingId
                      ? "Leave empty to keep current password"
                      : "Enter password"
                  }
                />
              </Field>
              <Field label="Active status">
                <label className="inline-flex items-center gap-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm text-[rgb(var(--fg))]">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        isActive: e.target.checked,
                      }))
                    }
                  />
                  Account active
                </label>
              </Field>
              {activeSection === "users" ? (
                <>
                  <Field label="Year" required>
                    <Input
                      type="number"
                      min="1"
                      max="4"
                      value={form.year}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, year: e.target.value }))
                      }
                      placeholder="1"
                    />
                  </Field>
                  <Field label="Semester" required>
                    <Input
                      type="number"
                      min="1"
                      max="8"
                      value={form.semester}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          semester: e.target.value,
                        }))
                      }
                      placeholder="1"
                    />
                  </Field>
                  <Field label="Enrollment number">
                    <Input
                      value={form.enrollmentNumber}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          enrollmentNumber: e.target.value,
                        }))
                      }
                      placeholder="Optional"
                    />
                  </Field>
                </>
              ) : (
                <div className="md:col-span-2 space-y-2">
                  <p className="text-sm font-medium text-[rgb(var(--fg))]">
                    Permissions
                  </p>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {adminPermissionOptions.map((permission) => (
                      <label
                        key={permission}
                        className="flex items-start gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3"
                      >
                        <input
                          type="checkbox"
                          checked={form.permissions.includes(permission)}
                          onChange={(e) => {
                            setForm((prev) => {
                              const next = new Set(prev.permissions);
                              if (e.target.checked) next.add(permission);
                              else next.delete(permission);
                              return { ...prev, permissions: Array.from(next) };
                            });
                          }}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-600"
                        />
                        <div>
                          <p className="text-sm font-medium text-[rgb(var(--fg))]">
                            {permission.replace(".", " ")}
                          </p>
                          <p className="text-xs text-[rgb(var(--muted))]">
                            {PERMISSION_HELPERS[permission]}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={resetForm} disabled={saving}>
                Reset
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update"
                    : `Create ${currentMeta.singular}`}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[rgb(var(--border))] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">
                {currentMeta.title} List
              </CardTitle>
              <p className="mt-1 text-sm text-gray-500">
                Search, edit, and delete records from the active section.
              </p>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={`Search ${currentMeta.title.toLowerCase()}...`}
                className="pl-9"
                value={currentSection.search}
                onChange={(e) =>
                  updateSection(activeSection, { search: e.target.value })
                }
              />
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={filteredItems}
              loading={currentSection.loading}
              emptyTitle={`No ${currentMeta.title.toLowerCase()} found`}
              emptyDescription={`Records will appear here once they are created.`}
              page={currentSection.page}
              totalPages={currentSection.totalPages}
              onPageChange={(nextPage) =>
                updateSection(activeSection, { page: nextPage })
              }
            />
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.user.role === "admin" ? "Team Member" : "User"}`}
        description={`Are you sure you want to delete ${deleteTarget?.user.fullName}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[rgb(var(--fg))]">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </label>
      {children}
    </div>
  );
}
