
export type AccountType = 'บัญชีเงินฝากออมทรัพย์ ทีทีบี ออลล์ฟรี' | 'ทีทีบี เซฟวิ่ง แคร์';

export type ClaimType = 'Medical Expense';

export interface UserData {
  firstName: string;
  lastName: string;
  nationalId: string;
  accountType: AccountType;
}

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

export interface VerificationResult {
  eligible: boolean;
  message: string;
}

/* ---------- Redbook chatbot ---------- */

/** A single normalized vehicle record sourced from the redbook Excel/API. */
export interface RedbookRecord {
  brand: string;
  model: string;
  year: number | null;
  value: number | null;
  subModel?: string;
  bodyType?: string;
  /** The original untouched row, so we can surface any extra columns. */
  raw: Record<string, unknown>;
}

/** Result of fuzzy-matching a user query against the redbook dataset. */
export interface RedbookMatch {
  record: RedbookRecord;
  /** Overall confidence 0-1. */
  score: number;
  brandScore: number;
  modelScore: number;
  yearScore: number;
}

/** What the user is searching for. */
export interface RedbookQuery {
  brand: string;
  model: string;
  year: number | null;
}

export type ChatRole = 'bot' | 'user';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  /** Optional match cards rendered beneath a bot message. */
  matches?: RedbookMatch[];
}
