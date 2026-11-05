// Small optimistic-transaction adapter for the existing CLI OAuth REST path.
// Only the shared provider pacing document can be read or changed here.
export function videoRateDb(headers, fetcher = fetch) {
  const base =
    "https://firestore.googleapis.com/v1/projects/ai-space-f1d31/databases/(default)/documents";
  const path = "videoProviderBudgets/google-video";
  const ref = { path };
  const encode = (value) =>
    typeof value === "string"
      ? { stringValue: value }
      : typeof value === "boolean"
        ? { booleanValue: value }
        : Number.isInteger(value)
          ? { integerValue: String(value) }
          : { doubleValue: value };
  return {
    collection(name) {
      if (name !== "videoProviderBudgets")
        throw Error("Unexpected pacing collection.");
      return {
        doc(id) {
          if (id !== "google-video") throw Error("Unexpected pacing document.");
          return ref;
        },
      };
    },
    async runTransaction(fn) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const response = await fetcher(`${base}/${path}`, { headers });
        if (!response.ok && response.status !== 404)
          throw Error(`Pacing read failed (${response.status}).`);
        const saved = response.ok ? await response.json() : null;
        const data = saved
          ? Object.fromEntries(
              Object.entries(saved.fields || {}).map(([key, value]) => [
                key,
                "integerValue" in value
                  ? Number(value.integerValue)
                  : "doubleValue" in value
                    ? value.doubleValue
                    : "booleanValue" in value
                      ? value.booleanValue
                      : value.stringValue,
              ]),
            )
          : undefined;
        let update;
        const result = await fn({
          get: async (target) => {
            if (target !== ref) throw Error("Unexpected pacing reference.");
            return { data: () => data };
          },
          set: (target, value) => {
            if (target !== ref) throw Error("Unexpected pacing reference.");
            update = { ...update, ...value };
          },
        });
        if (!update) return result;
        const commit = await fetcher(`${base}:commit`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            writes: [
              {
                update: {
                  name: `projects/ai-space-f1d31/databases/(default)/documents/${path}`,
                  fields: Object.fromEntries(
                    Object.entries(update).map(([key, value]) => [
                      key,
                      encode(value),
                    ]),
                  ),
                },
                updateMask: { fieldPaths: Object.keys(update) },
                currentDocument: saved
                  ? { updateTime: saved.updateTime }
                  : { exists: false },
              },
            ],
          }),
        });
        if (commit.ok) return result;
        if (![409, 412].includes(commit.status))
          throw Error(`Pacing reservation failed (${commit.status}).`);
      }
      throw Error("Pacing reservation changed concurrently. Retry later.");
    },
  };
}
