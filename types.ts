
export interface PassportData {
  id: string;
  passengerType?: 'ADULT' | 'CHILD' | 'INFANT';
  title?: 'MR' | 'MRS' | 'MS' | 'MSTR' | 'MISS' | string;
  firstName: string;
  lastName: string;
  passportNumber: string;
  nationality?: string;
  gender?: 'MALE' | 'FEMALE' | string;
  dateOfBirth?: string;
  issueDate?: string;
  expiryDate?: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
  isDuplicate?: boolean;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED'
}

export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
  key: keyof PassportData | null;
  order: SortOrder;
}
