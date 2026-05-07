"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User,
  Mail,
  GraduationCap,
  Calendar,
  Hash,
  Lock,
  LogOut,
  Edit3,
  Save,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useAuth } from "@/lib/hooks/useAuth";
import { authAPI } from "@/lib/api";
import { getInitials, cn } from "@/lib/utils";
import { YEARS } from "@/lib/constants";
import { toast } from "sonner";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.fullName || "");
  const [saving, setSaving] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await authAPI.updateProfile({ fullName: editName.trim() });
      toast.success("Name updated");
      setIsEditing(false);
    } catch {
      toast.error("Failed to update name");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (data: ChangePasswordForm) => {
    try {
      await authAPI.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success("Password changed successfully");
      setPasswordDialogOpen(false);
      reset();
    } catch {
      toast.error("Failed to change password. Check your current password.");
    }
  };

  const yearLabel =
    YEARS.find((y) => y.value === user.year)?.label || `Year ${user.year}`;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Profile
        </h1>
        <p className="text-gray-500 mt-1">Manage your account information.</p>
      </motion.div>

      {/* Profile Card */}
      <motion.div variants={item}>
        <Card>
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar */}
              <Avatar className="h-24 w-24 text-2xl">
                <AvatarFallback className="bg-brand-100 text-brand-700 text-2xl font-bold">
                  {getInitials(user.fullName)}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                {isEditing ? (
                  <div className="flex items-center gap-2 mb-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="max-w-xs"
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveName}
                      disabled={saving}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsEditing(false);
                        setEditName(user.fullName);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-gray-900">
                      {user.fullName}
                    </h2>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditing(true)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                <p className="text-gray-500 text-sm">{user.email}</p>
                <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
                  <Badge variant="default">{yearLabel}</Badge>
                  {user.enrollmentNumber && (
                    <Badge variant="secondary">{user.enrollmentNumber}</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Details */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow icon={User} label="Full Name" value={user.fullName} />
            <InfoRow icon={Mail} label="Email" value={user.email} />
            <InfoRow icon={GraduationCap} label="Year" value={yearLabel} />
            {user.enrollmentNumber && (
              <InfoRow
                icon={Hash}
                label="Enrollment No."
                value={user.enrollmentNumber}
              />
            )}
            <InfoRow
              icon={Calendar}
              label="Joined"
              value={
                user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"
              }
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Security */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Security</CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog
              open={passwordDialogOpen}
              onOpenChange={setPasswordDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Lock className="mr-2 h-4 w-4" />
                  Change Password
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={handleSubmit(handleChangePassword)}
                  className="space-y-4 mt-2"
                >
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      {...register("currentPassword")}
                      error={errors.currentPassword?.message}
                    />
                  </div>
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      {...register("newPassword")}
                      error={errors.newPassword?.message}
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">
                      Confirm New Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      {...register("confirmPassword")}
                      error={errors.confirmPassword?.message}
                    />
                  </div>
                  <Button
                    type="submit"
                    isLoading={isSubmitting}
                    className="w-full"
                  >
                    Update Password
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </motion.div>

      {/* Logout */}
      <motion.div variants={item}>
        <Button
          variant="outline"
          className="w-full text-red-600 border-red-200 hover:bg-red-50"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log Out
        </Button>
      </motion.div>
    </motion.div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center shadow-sm">
        <Icon className="h-4 w-4 text-gray-500" />
      </div>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value}</p>
      </div>
    </div>
  );
}
