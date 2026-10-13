export type HubMetadata = {
  downloads: number | null;
  likes: number | null;
  task: string;
  license: string;
  modified: string;
  fetchedAt: string;
};
const cache = new Map<string, { value: HubMetadata; expires: number }>();
export async function fetchHubMetadata(
  id: string,
  signal: AbortSignal,
): Promise<HubMetadata> {
  const hit = cache.get(id);
  if (hit && hit.expires > Date.now()) return hit.value;
  const response = await fetch(
    `https://huggingface.co/api/models/${id.split("/").map(encodeURIComponent).join("/")}`,
    { signal, credentials: "omit" },
  );
  if (!response.ok)
    throw Error(
      response.status === 429
        ? "Hugging Face rate limit; retry later."
        : `Metadata unavailable (${response.status}).`,
    );
  const data = await response.json();
  if (data.id !== id) throw Error("Unexpected model metadata.");
  const count = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
  const value = {
    downloads: count(data.downloads),
    likes: count(data.likes),
    task:
      typeof data.pipeline_tag === "string"
        ? data.pipeline_tag
        : "Not supplied",
    license:
      typeof data.cardData?.license === "string"
        ? data.cardData.license
        : "See model card",
    modified: typeof data.lastModified === "string" ? data.lastModified : "",
    fetchedAt: new Date().toISOString(),
  };
  cache.set(id, { value, expires: Date.now() + 5 * 60_000 });
  return value;
}
