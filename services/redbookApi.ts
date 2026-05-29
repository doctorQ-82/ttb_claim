import { RedbookRecord } from '../types';
import { normalize } from './redbookMatch';

/**
 * Loads the redbook dataset.
 *
 * The data is expected to originate from an Excel file that a backend exposes
 * as JSON. Set `REDBOOK_API_URL` (see vite.config.ts) to your endpoint; it
 * should return either an array of row objects or `{ data: [...] }`, where each
 * row is one spreadsheet row keyed by its (Thai or English) column header.
 *
 * Column names are auto-detected, so the spreadsheet headers don't have to
 * match a fixed schema. If the API is not configured or unreachable, a small
 * bundled sample dataset is used so the chatbot still works out-of-the-box.
 */

const API_URL: string =
  (typeof process !== 'undefined' && process.env && process.env.REDBOOK_API_URL) || '';

type RawRow = Record<string, unknown>;

/** Candidate header keywords (normalized) for each canonical field. */
const FIELD_ALIASES: Record<keyof FieldMap, string[]> = {
  brand: ['ยี่ห้อรถ', 'ยี่ห้อ', 'brand', 'make', 'manufacturer', 'maker'],
  model: ['รุ่นรถ', 'รุ่น', 'model', 'series'],
  subModel: ['รุ่นย่อย', 'submodel', 'sub model', 'variant', 'trim', 'grade', 'เกรด'],
  year: ['ปีรถ', 'ปี', 'รุ่นปี', 'ปีจดทะเบียน', 'year', 'model year', 'yr'],
  value: ['ราคากลาง', 'ราคา', 'มูลค่า', 'redbook', 'value', 'price', 'amount'],
  bodyType: ['ตัวถัง', 'ประเภทรถ', 'ประเภท', 'body', 'body type', 'bodytype'],
};

interface FieldMap {
  brand: string | null;
  model: string | null;
  subModel: string | null;
  year: string | null;
  value: string | null;
  bodyType: string | null;
}

/** Inspect the first rows and decide which raw column maps to which field. */
const detectColumns = (rows: RawRow[]): FieldMap => {
  const map: FieldMap = {
    brand: null,
    model: null,
    subModel: null,
    year: null,
    value: null,
    bodyType: null,
  };
  if (!rows.length) return map;

  const headers = Object.keys(rows[0]);
  const used = new Set<string>();

  (Object.keys(FIELD_ALIASES) as (keyof FieldMap)[]).forEach((field) => {
    const aliases = FIELD_ALIASES[field];
    // Prefer an exact normalized header match, then a contains-match.
    let best: string | null = null;
    for (const header of headers) {
      if (used.has(header)) continue;
      const h = normalize(header);
      if (aliases.some((a) => h === normalize(a))) {
        best = header;
        break;
      }
    }
    if (!best) {
      for (const header of headers) {
        if (used.has(header)) continue;
        const h = normalize(header);
        if (aliases.some((a) => h.includes(normalize(a)))) {
          best = header;
          break;
        }
      }
    }
    if (best) {
      map[field] = best;
      used.add(best);
    }
  });

  return map;
};

const toNumber = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/[, ฿]/g, ''));
  return Number.isFinite(n) ? n : null;
};

const toText = (v: unknown): string => (v == null ? '' : String(v).trim());

/** Convert raw spreadsheet rows into normalized RedbookRecords. */
export const normalizeRows = (rows: RawRow[]): RedbookRecord[] => {
  const cols = detectColumns(rows);
  return rows
    .map((row): RedbookRecord => {
      const yearNum = cols.year ? toNumber(row[cols.year]) : null;
      return {
        brand: cols.brand ? toText(row[cols.brand]) : '',
        model: cols.model ? toText(row[cols.model]) : '',
        subModel: cols.subModel ? toText(row[cols.subModel]) : undefined,
        year: yearNum != null ? Math.round(yearNum) : null,
        value: cols.value ? toNumber(row[cols.value]) : null,
        bodyType: cols.bodyType ? toText(row[cols.bodyType]) : undefined,
        raw: row,
      };
    })
    .filter((r) => r.brand || r.model);
};

export interface LoadResult {
  records: RedbookRecord[];
  /** Where the data came from, for transparency in the UI. */
  source: 'api' | 'sample';
}

/** Fetch + normalize the dataset, falling back to the bundled sample. */
export const loadRedbook = async (): Promise<LoadResult> => {
  if (API_URL) {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const rows: RawRow[] = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
      const records = normalizeRows(rows);
      if (records.length) return { records, source: 'api' };
    } catch (err) {
      // Network/parse failure -> fall through to the sample dataset.
      console.warn('[redbook] API load failed, using sample data:', err);
    }
  }
  return { records: normalizeRows(SAMPLE_ROWS), source: 'sample' };
};

/**
 * Bundled sample data. Headers are intentionally in Thai to exercise the
 * column auto-detection. Values are illustrative only.
 */
const SAMPLE_ROWS: RawRow[] = [
  { 'ยี่ห้อรถ': 'Toyota', 'รุ่นรถ': 'Camry', 'รุ่นย่อย': '2.0G', 'ปีรถ': 2018, 'ราคากลาง': 850000, 'ตัวถัง': 'Sedan' },
  { 'ยี่ห้อรถ': 'Toyota', 'รุ่นรถ': 'Camry', 'รุ่นย่อย': '2.5HV', 'ปีรถ': 2020, 'ราคากลาง': 1080000, 'ตัวถัง': 'Sedan' },
  { 'ยี่ห้อรถ': 'Toyota', 'รุ่นรถ': 'Corolla Altis', 'รุ่นย่อย': '1.8E', 'ปีรถ': 2019, 'ราคากลาง': 720000, 'ตัวถัง': 'Sedan' },
  { 'ยี่ห้อรถ': 'Toyota', 'รุ่นรถ': 'Hilux Revo', 'รุ่นย่อย': '2.4E', 'ปีรถ': 2021, 'ราคากลาง': 690000, 'ตัวถัง': 'Pickup' },
  { 'ยี่ห้อรถ': 'Toyota', 'รุ่นรถ': 'Fortuner', 'รุ่นย่อย': '2.8V', 'ปีรถ': 2020, 'ราคากลาง': 1320000, 'ตัวถัง': 'SUV' },
  { 'ยี่ห้อรถ': 'Toyota', 'รุ่นรถ': 'Yaris', 'รุ่นย่อย': '1.2E', 'ปีรถ': 2019, 'ราคากลาง': 480000, 'ตัวถัง': 'Hatchback' },
  { 'ยี่ห้อรถ': 'Honda', 'รุ่นรถ': 'Civic', 'รุ่นย่อย': '1.5 Turbo', 'ปีรถ': 2018, 'ราคากลาง': 880000, 'ตัวถัง': 'Sedan' },
  { 'ยี่ห้อรถ': 'Honda', 'รุ่นรถ': 'Civic', 'รุ่นย่อย': '1.8EL', 'ปีรถ': 2020, 'ราคากลาง': 950000, 'ตัวถัง': 'Sedan' },
  { 'ยี่ห้อรถ': 'Honda', 'รุ่นรถ': 'City', 'รุ่นย่อย': '1.0 Turbo SV', 'ปีรถ': 2021, 'ราคากลาง': 620000, 'ตัวถัง': 'Sedan' },
  { 'ยี่ห้อรถ': 'Honda', 'รุ่นรถ': 'CR-V', 'รุ่นย่อย': '2.4EL', 'ปีรถ': 2019, 'ราคากลาง': 1450000, 'ตัวถัง': 'SUV' },
  { 'ยี่ห้อรถ': 'Honda', 'รุ่นรถ': 'Jazz', 'รุ่นย่อย': '1.5RS', 'ปีรถ': 2018, 'ราคากลาง': 560000, 'ตัวถัง': 'Hatchback' },
  { 'ยี่ห้อรถ': 'Isuzu', 'รุ่นรถ': 'D-Max', 'รุ่นย่อย': '1.9 Ddi', 'ปีรถ': 2020, 'ราคากลาง': 730000, 'ตัวถัง': 'Pickup' },
  { 'ยี่ห้อรถ': 'Isuzu', 'รุ่นรถ': 'MU-X', 'รุ่นย่อย': '1.9', 'ปีรถ': 2021, 'ราคากลาง': 1190000, 'ตัวถัง': 'SUV' },
  { 'ยี่ห้อรถ': 'Mazda', 'รุ่นรถ': 'Mazda2', 'รุ่นย่อย': '1.3S', 'ปีรถ': 2019, 'ราคากลาง': 530000, 'ตัวถัง': 'Sedan' },
  { 'ยี่ห้อรถ': 'Mazda', 'รุ่นรถ': 'CX-5', 'รุ่นย่อย': '2.0SP', 'ปีรถ': 2020, 'ราคากลาง': 1290000, 'ตัวถัง': 'SUV' },
  { 'ยี่ห้อรถ': 'Nissan', 'รุ่นรถ': 'Almera', 'รุ่นย่อย': '1.0 Turbo V', 'ปีรถ': 2021, 'ราคากลาง': 560000, 'ตัวถัง': 'Sedan' },
  { 'ยี่ห้อรถ': 'Nissan', 'รุ่นรถ': 'Navara', 'รุ่นย่อย': '2.5 Calibre', 'ปีรถ': 2019, 'ราคากลาง': 650000, 'ตัวถัง': 'Pickup' },
  { 'ยี่ห้อรถ': 'Mitsubishi', 'รุ่นรถ': 'Triton', 'รุ่นย่อย': '2.4 GLS', 'ปีรถ': 2020, 'ราคากลาง': 700000, 'ตัวถัง': 'Pickup' },
  { 'ยี่ห้อรถ': 'Mitsubishi', 'รุ่นรถ': 'Pajero Sport', 'รุ่นย่อย': '2.4 GT', 'ปีรถ': 2021, 'ราคากลาง': 1280000, 'ตัวถัง': 'SUV' },
  { 'ยี่ห้อรถ': 'Mitsubishi', 'รุ่นรถ': 'Xpander', 'รุ่นย่อย': '1.5 GT', 'ปีรถ': 2020, 'ราคากลาง': 790000, 'ตัวถัง': 'MPV' },
  { 'ยี่ห้อรถ': 'Ford', 'รุ่นรถ': 'Ranger', 'รุ่นย่อย': '2.0 Wildtrak', 'ปีรถ': 2021, 'ราคากลาง': 980000, 'ตัวถัง': 'Pickup' },
  { 'ยี่ห้อรถ': 'Ford', 'รุ่นรถ': 'Everest', 'รุ่นย่อย': '2.0 Titanium', 'ปีรถ': 2020, 'ราคากลาง': 1490000, 'ตัวถัง': 'SUV' },
  { 'ยี่ห้อรถ': 'Mercedes-Benz', 'รุ่นรถ': 'C-Class', 'รุ่นย่อย': 'C300 AMG', 'ปีรถ': 2019, 'ราคากลาง': 2350000, 'ตัวถัง': 'Sedan' },
  { 'ยี่ห้อรถ': 'BMW', 'รุ่นรถ': '320d', 'รุ่นย่อย': 'M Sport', 'ปีรถ': 2020, 'ราคากลาง': 2150000, 'ตัวถัง': 'Sedan' },
  { 'ยี่ห้อรถ': 'BMW', 'รุ่นรถ': 'X1', 'รุ่นย่อย': 'sDrive18i', 'ปีรถ': 2021, 'ราคากลาง': 1990000, 'ตัวถัง': 'SUV' },
];
