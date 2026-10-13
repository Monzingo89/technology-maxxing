export function learningDestination(
  hash: string,
): { kind: "learn" | "assessment"; value: string } | null {
  if (!hash.startsWith("#login?")) return null;
  const p = new URLSearchParams(hash.slice(7));
  const learn = p.get("learn");
  if (learn && /^learn\/[a-z0-9_-]+\/$/.test(learn))
    return { kind: "learn", value: learn };
  const assessment = p.get("assessment");
  if (assessment && /^[a-z0-9_-]+$/.test(assessment))
    return { kind: "assessment", value: assessment };
  return null;
}
export const learningLogin = (path: string) =>
  `#login?learn=${encodeURIComponent(path)}`;
