export function normalizeApiRoot(url: string) {
  const trimmed = url.replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed.slice(0, -4) : trimmed;
}

export function getApiRoot() {
  return normalizeApiRoot(
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
  );
}
