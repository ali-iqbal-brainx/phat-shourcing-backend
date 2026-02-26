export type QuotationStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export interface QuotationItem {
  productId?: string;
  name: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  dimensions?: string;
  image?: string;
  status: 'AVAILABLE' | 'NOT_IN_INVENTORY';
}

export interface Quotation {
  id: string;
  status: QuotationStatus;
  items: QuotationItem[];
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

