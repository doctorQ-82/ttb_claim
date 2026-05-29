import { RedbookRecord, RedbookMatch, RedbookQuery } from '../types';

/**
 * Fuzzy matching engine for redbook vehicle lookups.
 *
 * Given a brand / model / year query, it ranks every record in the dataset
 * and returns the closest matches. Brand and model are compared with a blend
 * of normalized equality, token overlap and edit distance; year contributes a
 * proximity score so the "closest" model year wins when an exact year is
 * missing.
 */

/** Normalize a string for comparison: lowercase, collapse whitespace, strip noise. */
export const normalize = (input: string): string =>
  (input ?? '')
    .toString()
    .toLowerCase()
    .normalize('NFC')
    .replace(/[._/\\\-]+/g, ' ')
    .replace(/[()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Classic Levenshtein edit distance. */
const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
};

/** Edit-distance similarity in [0,1]. */
const editSimilarity = (a: string, b: string): number => {
  if (!a && !b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
};

/** Token (word) overlap similarity in [0,1], rewards shared and contained words. */
const tokenSimilarity = (a: string, b: string): number => {
  const ta = a.split(' ').filter(Boolean);
  const tb = b.split(' ').filter(Boolean);
  if (!ta.length || !tb.length) return 0;

  let matched = 0;
  for (const wa of ta) {
    const hit = tb.some(
      (wb) => wb === wa || wb.includes(wa) || wa.includes(wb) || editSimilarity(wa, wb) >= 0.8,
    );
    if (hit) matched++;
  }
  // Symmetric-ish: share of query tokens that found a home.
  return matched / ta.length;
};

/**
 * Combined text similarity in [0,1]. A substring containment is treated as a
 * strong signal (e.g. "camry" vs "camry 2.0g").
 */
export const textSimilarity = (query: string, candidate: string): number => {
  const q = normalize(query);
  const c = normalize(candidate);
  if (!q) return 0;
  if (q === c) return 1;
  if (c.includes(q) || q.includes(c)) return 0.92;

  const edit = editSimilarity(q, c);
  const token = tokenSimilarity(q, c);
  return Math.max(edit, token * 0.95, (edit + token) / 2);
};

/** Year proximity score in [0,1]; decays ~0.1 per year of difference. */
const yearSimilarity = (queryYear: number | null, recordYear: number | null): number => {
  if (queryYear == null) return 1; // year not part of the query -> neutral
  if (recordYear == null) return 0.3; // record has no year -> weak
  const diff = Math.abs(queryYear - recordYear);
  if (diff === 0) return 1;
  return Math.max(0, 1 - diff / 10);
};

const WEIGHTS_WITH_YEAR = { brand: 0.3, model: 0.45, year: 0.25 };
const WEIGHTS_NO_YEAR = { brand: 0.4, model: 0.6, year: 0 };

/**
 * Rank all records against the query and return the top matches.
 *
 * @param records dataset
 * @param query   user input (brand/model/year)
 * @param limit   max results to return
 */
export const findMatches = (
  records: RedbookRecord[],
  query: RedbookQuery,
  limit = 5,
): RedbookMatch[] => {
  const hasYear = query.year != null;
  const w = hasYear ? WEIGHTS_WITH_YEAR : WEIGHTS_NO_YEAR;
  const hasBrand = normalize(query.brand).length > 0;
  const hasModel = normalize(query.model).length > 0;

  const scored: RedbookMatch[] = records.map((record) => {
    const brandScore = hasBrand ? textSimilarity(query.brand, record.brand) : 1;
    // Match the model against "model" and "model + subModel" and keep the best.
    const modelTarget = [record.model, record.subModel].filter(Boolean).join(' ');
    const modelScore = hasModel
      ? Math.max(
          textSimilarity(query.model, record.model),
          textSimilarity(query.model, modelTarget),
        )
      : 1;
    const yearScore = yearSimilarity(query.year, record.year);

    const score = brandScore * w.brand + modelScore * w.model + yearScore * w.year;
    return { record, score, brandScore, modelScore, yearScore };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .filter((m) => m.score > 0.15);
};

/** Distinct, display-cased brand names present in the dataset. */
export const distinctBrands = (records: RedbookRecord[]): string[] => {
  const seen = new Map<string, string>();
  for (const r of records) {
    const key = normalize(r.brand);
    if (key && !seen.has(key)) seen.set(key, r.brand);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
};

/**
 * Parse a free-form line such as "Toyota Camry 2.0G 2018" into a query.
 * A 4-digit token in a plausible range is taken as the year; the first token
 * matching a known brand is the brand and the remainder is the model.
 */
export const parseFreeText = (text: string, knownBrands: string[]): RedbookQuery => {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  let year: number | null = null;
  const rest: string[] = [];
  const currentYear = new Date().getFullYear();

  for (const tok of tokens) {
    const n = Number(tok);
    if (year == null && /^\d{4}$/.test(tok) && n >= 1950 && n <= currentYear + 2) {
      year = n;
    } else {
      rest.push(tok);
    }
  }

  // Find a known brand anywhere in the remaining tokens (prefer longest match).
  let brand = '';
  let modelTokens = [...rest];
  const normalizedBrands = knownBrands
    .map((b) => ({ display: b, norm: normalize(b) }))
    .sort((a, b) => b.norm.length - a.norm.length);

  const restNorm = normalize(rest.join(' '));
  for (const { display, norm } of normalizedBrands) {
    if (restNorm.includes(norm)) {
      brand = display;
      // Remove the brand tokens from the model portion.
      const brandWords = norm.split(' ');
      modelTokens = rest.filter((t) => !brandWords.includes(normalize(t)));
      break;
    }
  }

  if (!brand && rest.length) {
    // Fall back: first token is the brand.
    brand = rest[0];
    modelTokens = rest.slice(1);
  }

  return { brand, model: modelTokens.join(' '), year };
};
