const map: Record<string, string> = { á: "a", ð: "d", é: "e", í: "i", ó: "o", ú: "u", ý: "y", þ: "th", æ: "ae", ö: "o" };

/** Creates a URL-safe slug from Icelandic text: "Pípulagnir Þórs ehf." → "pipulagnir-thors-ehf". */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[áðéíóúýþæö]/g, (c) => map[c] ?? c)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
