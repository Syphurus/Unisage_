import ResetPasswordClient from "./reset-password-client";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: { token?: string };
}) {
  return <ResetPasswordClient initialToken={searchParams?.token || ""} />;
}