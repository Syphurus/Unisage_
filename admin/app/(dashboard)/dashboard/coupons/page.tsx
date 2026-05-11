"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  CheckCircle2,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  Tag,
  XCircle,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  couponsApi,
  type AdminCoupon,
  type CouponListResponse,
  type CouponMutationBody,
  type CouponStatusFilter,
  type CouponType,
  type CouponRedemption,
} from "@/lib/coupons";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: Array<{ value: CouponStatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "expired", label: "Expired" },
];

interface CouponForm {
  code: string;
  type: CouponType;
  value: string;
  maxDiscount: string;
  minPurchase: string;
  usageLimit: string;
  perUserUsageLimit: string;
  allowedEmailDomains: string;
  firstPurchaseOnly: boolean;
  active: boolean;
  expiresAt: string;
}

const emptyForm: CouponForm = {
  code: "",
  type: "percentage",
  value: "",
  maxDiscount: "",
  minPurchase: "0",
  usageLimit: "",
  perUserUsageLimit: "1",
  allowedEmailDomains: "",
  firstPurchaseOnly: false,
  active: true,
  expiresAt: "",
};

function rupeesToPaise(value: string, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n * 100);
}

function paiseToRupees(value?: number | null) {
  if (value === null || value === undefined) return "";
  return (value / 100).toFixed(2);
}

function formatExpiry(value: string | null) {
  if (!value) return "No expiry";
  return new Date(value).toLocaleString();
}

function couponStatus(coupon: AdminCoupon) {
  if (!coupon.active) return { label: "Inactive", cls: "bg-gray-100 text-gray-700" };
  if (coupon.expiresAt && new Date(coupon.expiresAt) <= new Date()) {
    return { label: "Expired", cls: "bg-red-100 text-red-700" };
  }
  return { label: "Active", cls: "bg-emerald-100 text-emerald-700" };
}

function formFromCoupon(coupon: AdminCoupon): CouponForm {
  return {
    code: coupon.code,
    type: coupon.type,
    value: coupon.type === "fixed" ? paiseToRupees(coupon.value) : String(coupon.value),
    maxDiscount: paiseToRupees(coupon.maxDiscountInrPaise),
    minPurchase: paiseToRupees(coupon.minPurchaseInrPaise),
    usageLimit: coupon.usageLimit === null ? "" : String(coupon.usageLimit),
    perUserUsageLimit:
      coupon.perUserUsageLimit === null ? "" : String(coupon.perUserUsageLimit),
    allowedEmailDomains: coupon.allowedEmailDomains.join(", "),
    firstPurchaseOnly: coupon.firstPurchaseOnly,
    active: coupon.active,
    expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 16) : "",
  };
}

function mutationFromForm(form: CouponForm): CouponMutationBody {
  return {
    code: form.code.trim().toUpperCase(),
    type: form.type,
    value:
      form.type === "fixed"
        ? rupeesToPaise(form.value)
        : Number(form.value),
    maxDiscountInrPaise: form.maxDiscount.trim()
      ? rupeesToPaise(form.maxDiscount)
      : null,
    minPurchaseInrPaise: rupeesToPaise(form.minPurchase || "0"),
    usageLimit: form.usageLimit.trim() ? Number(form.usageLimit) : null,
    perUserUsageLimit: form.perUserUsageLimit.trim()
      ? Number(form.perUserUsageLimit)
      : null,
    allowedEmailDomains: form.allowedEmailDomains
      .split(",")
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean),
    firstPurchaseOnly: form.firstPurchaseOnly,
    active: form.active,
    expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
  };
}

export default function CouponsPage() {
  const [status, setStatus] = useState<CouponStatusFilter>("all");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCoupon | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [redemptions, setRedemptions] = useState<CouponRedemption[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const swrKey = `coupons:${status}:${debouncedQ}`;
  const { data, error, isLoading, mutate } = useSWR<CouponListResponse>(
    swrKey,
    () =>
      couponsApi.list({
        status,
        q: debouncedQ || undefined,
        limit: 100,
      }),
    { onError: (err) => toast.error(err.message) }
  );

  const rows = data?.rows ?? [];

  const totals = useMemo(
    () => ({
      active: rows.filter((coupon) => couponStatus(coupon).label === "Active").length,
      used: rows.reduce((sum, coupon) => sum + coupon.usedCount, 0),
    }),
    [rows]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setRedemptions([]);
    setDialogOpen(true);
  };

  const openEdit = async (coupon: AdminCoupon) => {
    setEditing(coupon);
    setForm(formFromCoupon(coupon));
    setRedemptions([]);
    setDialogOpen(true);
    try {
      const data = await couponsApi.redemptions(coupon.id);
      setRedemptions(data.rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load redemptions");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = mutationFromForm(form);
      if (editing) {
        await couponsApi.update(editing.id, body);
        toast.success("Coupon updated");
      } else {
        await couponsApi.create(body);
        toast.success("Coupon created");
      }
      setDialogOpen(false);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save coupon");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon: AdminCoupon) => {
    try {
      await couponsApi.update(coupon.id, { active: !coupon.active });
      toast.success(!coupon.active ? "Coupon enabled" : "Coupon disabled");
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update coupon");
    }
  };

  return (
    <div>
      <TopBar title="Coupons" />
      <div className="space-y-4 p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm transition-colors",
                  status === opt.value
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface-subtle))]"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New coupon
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs text-[rgb(var(--muted))]">Coupons shown</p>
            <p className="mt-1 text-2xl font-semibold">{rows.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-[rgb(var(--muted))]">Active now</p>
            <p className="mt-1 text-2xl font-semibold">{totals.active}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-[rgb(var(--muted))]">Reserved/redeemed uses</p>
            <p className="mt-1 text-2xl font-semibold">{totals.used}</p>
          </Card>
        </div>

        <Card className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--muted))]" />
            <Input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search coupon code"
              className="pl-9"
            />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Limits</TableHead>
                <TableHead>Eligibility</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-[rgb(var(--muted))]">
                    Loading coupons...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-red-600">
                    Failed to load: {error.message}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-[rgb(var(--muted))]">
                    No coupons yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((coupon) => {
                  const status = couponStatus(coupon);
                  return (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-brand-600" />
                          <span className="font-mono text-xs font-semibold">{coupon.code}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex rounded px-2 py-0.5 text-xs font-medium", status.cls)}>
                          {status.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {coupon.type === "percentage"
                          ? `${coupon.value}%${coupon.maxDiscount ? ` up to ₹${coupon.maxDiscount}` : ""}`
                          : `₹${paiseToRupees(coupon.value)}`}
                      </TableCell>
                      <TableCell className="text-xs text-[rgb(var(--muted))]">
                        {coupon.usedCount}/{coupon.usageLimit ?? "∞"} total · {coupon.perUserUsageLimit ?? "∞"}/user
                      </TableCell>
                      <TableCell className="text-xs text-[rgb(var(--muted))]">
                        Min ₹{coupon.minPurchase}
                        {coupon.firstPurchaseOnly ? " · first purchase" : ""}
                        {coupon.allowedEmailDomains.length
                          ? ` · ${coupon.allowedEmailDomains.join(", ")}`
                          : ""}
                      </TableCell>
                      <TableCell className="text-xs text-[rgb(var(--muted))]">
                        {formatExpiry(coupon.expiresAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(coupon)}>
                            <Edit3 className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant={coupon.active ? "destructive" : "secondary"}
                            size="sm"
                            onClick={() => toggleActive(coupon)}
                          >
                            {coupon.active ? (
                              <XCircle className="mr-2 h-4 w-4" />
                            ) : (
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                            )}
                            {coupon.active ? "Disable" : "Enable"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.code}` : "Create coupon"}</DialogTitle>
            <DialogDescription>
              Configure eligibility, expiry, usage limits, and discount rules.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Code">
              <Input
                value={form.code}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))
                }
                placeholder="SAVE50"
              />
            </Field>

            <Field label="Discount type">
              <Select
                value={form.type}
                onValueChange={(value: CouponType) =>
                  setForm((prev) => ({ ...prev, type: value, value: "" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label={form.type === "percentage" ? "Discount percentage" : "Fixed discount in ₹"}>
              <Input
                type="number"
                min="0"
                value={form.value}
                onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))}
                placeholder={form.type === "percentage" ? "50" : "100"}
              />
            </Field>

            <Field label="Max discount in ₹">
              <Input
                type="number"
                min="0"
                value={form.maxDiscount}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, maxDiscount: event.target.value }))
                }
                placeholder="Optional"
              />
            </Field>

            <Field label="Minimum purchase in ₹">
              <Input
                type="number"
                min="0"
                value={form.minPurchase}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, minPurchase: event.target.value }))
                }
              />
            </Field>

            <Field label="Total usage limit">
              <Input
                type="number"
                min="0"
                value={form.usageLimit}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, usageLimit: event.target.value }))
                }
                placeholder="Unlimited"
              />
            </Field>

            <Field label="Per-user usage limit">
              <Input
                type="number"
                min="1"
                value={form.perUserUsageLimit}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, perUserUsageLimit: event.target.value }))
                }
                placeholder="Unlimited"
              />
            </Field>

            <Field label="Expires at">
              <Input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, expiresAt: event.target.value }))
                }
              />
            </Field>

            <Field label="Allowed email domains" className="md:col-span-2">
              <Input
                value={form.allowedEmailDomains}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, allowedEmailDomains: event.target.value }))
                }
                placeholder="upes.ac.in, example.edu"
              />
            </Field>

            <div className="flex items-center justify-between rounded-lg border border-[rgb(var(--border))] p-3">
              <div>
                <Label>First purchase only</Label>
                <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                  Rejects users with any approved payment.
                </p>
              </div>
              <Switch
                checked={form.firstPurchaseOnly}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, firstPurchaseOnly: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[rgb(var(--border))] p-3">
              <div>
                <Label>Active</Label>
                <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                  Inactive coupons cannot be applied.
                </p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, active: checked }))
                }
              />
            </div>
          </div>

          {editing && (
            <div className="mt-5 rounded-lg border border-[rgb(var(--border))]">
              <div className="border-b border-[rgb(var(--border))] px-4 py-3">
                <p className="text-sm font-semibold">Recent redemptions</p>
              </div>
              <div className="max-h-56 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {redemptions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-[rgb(var(--muted))]">
                          No redemptions yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      redemptions.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="capitalize">{row.status}</TableCell>
                          <TableCell>₹{row.discount}</TableCell>
                          <TableCell className="font-mono text-xs">{row.userId.slice(0, 8)}</TableCell>
                          <TableCell className="font-mono text-xs">{row.paymentId.slice(0, 8)}</TableCell>
                          <TableCell className="text-xs text-[rgb(var(--muted))]">
                            {new Date(row.createdAt).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving..." : editing ? "Save changes" : "Create coupon"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
