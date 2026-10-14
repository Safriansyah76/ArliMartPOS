export interface Product {
  id: string;
  barcode: string;
  name: string;
  category: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
  discountPercent?: number; // e.g. 10 for 10%
  discountAmount?: number; // calculated item discount in Rp
}

export type PaymentMethod = 'cash' | 'qris' | 'transfer' | 'debit';

export interface Transaction {
  id: string;
  receiptNumber: string;
  timestamp: string;
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  totalCost: number;
  profit: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  change: number;
  customerName?: string;
  notes?: string;
  syncedToSheets?: boolean;
}

export interface StoreProfile {
  name: string;
  address: string;
  phone: string;
  receiptFooter: string;
  taxRate: number; // e.g. 11 for 11%
  taxEnabled: boolean;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'sale' | 'adjustment';
  quantity: number;
  previousStock: number;
  newStock: number;
  timestamp: string;
  notes: string;
}

export interface ExportReportData {
  spreadsheetUrl?: string;
  spreadsheetId?: string;
  lastExportedAt?: string;
}
