
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
