import { Product, CartItem, Transaction, StoreProfile, StockMovement } from '../types';

const STORAGE_KEYS = {
  PRODUCTS: 'kasirku_products_v1',
  TRANSACTIONS: 'kasirku_transactions_v1',
  PROFILE: 'kasirku_profile_v1',
  STOCK_LOGS: 'kasirku_stock_logs_v1',
  SHEETS_SYNC: 'kasirku_sheets_sync_v1',
};

export const INITIAL_PROFILE: StoreProfile = {
  name: 'Toko Berkah Mart',
  address: 'Jl. Raya Sudirman No. 88, Jakarta Selatan',
  phone: '0812-8899-7722',
  receiptFooter: 'Terima kasih telah berbelanja di Toko Berkah Mart!\nBarang yang sudah dibeli tidak dapat ditukar kecuali perjanjian.',
  taxRate: 11,
  taxEnabled: false, // Default off for small retail, can be toggled
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    barcode: '899999901001',
    name: 'Indomie Goreng Spesial 85g',
    category: 'Makanan Instan',
    buyPrice: 2800,
    sellPrice: 3500,
    stock: 48,
    minStock: 10,
    unit: 'pcs',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-002',
    barcode: '899999901002',
    name: 'Aqua Air Mineral Botol 600ml',
    category: 'Minuman',
    buyPrice: 3000,
    sellPrice: 4500,
    stock: 24,
    minStock: 8,
    unit: 'botol',
    createdAt: new Date(Date.now() - 28 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-003',
    barcode: '899999901003',
    name: 'Teh Pucuk Harum Melati 350ml',
    category: 'Minuman',
    buyPrice: 3200,
    sellPrice: 4500,
    stock: 18,
    minStock: 6,
    unit: 'botol',
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-004',
    barcode: '899999901004',
    name: 'Minyak Goreng Bimoli 1 Liter',
    category: 'Sembako',
    buyPrice: 17500,
    sellPrice: 20500,
    stock: 15,
    minStock: 5,
    unit: 'pouch',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-005',
    barcode: '899999901005',
    name: 'Gula Pasir Gulaku Premium 1kg',
    category: 'Sembako',
    buyPrice: 15000,
    sellPrice: 17500,
    stock: 12,
    minStock: 4,
    unit: 'kg',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-006',
    barcode: '899999901006',
    name: 'Beras Ramos Premium 5kg',
    category: 'Sembako',
    buyPrice: 68000,
    sellPrice: 76000,
    stock: 7,
    minStock: 3,
    unit: 'karung',
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-007',
    barcode: '899999901007',
    name: 'Kopi Kapal Api Spesial Mix 10x24g',
    category: 'Minuman',
    buyPrice: 11000,
    sellPrice: 13500,
    stock: 20,
    minStock: 5,
    unit: 'renteng',
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-008',
    barcode: '899999901008',
    name: 'Susu Ultra Milk UHT Cokelat 250ml',
    category: 'Minuman',
    buyPrice: 5500,
    sellPrice: 7000,
    stock: 4, // low stock alert demo
    minStock: 6,
    unit: 'kotak',
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-009',
    barcode: '899999901009',
    name: 'Chitato Sapi Panggang 68g',
    category: 'Snack & Biskuit',
    buyPrice: 8500,
    sellPrice: 11000,
    stock: 16,
    minStock: 5,
    unit: 'bungkus',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-010',
    barcode: '899999901010',
    name: 'Sunlight Pencuci Piring Jeruk Nipis 700ml',
    category: 'Kebersihan',
    buyPrice: 13000,
    sellPrice: 16000,
    stock: 3, // low stock demo
    minStock: 5,
    unit: 'pouch',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-011',
    barcode: '899999901011',
    name: 'Sabun Mandi Lifebuoy Total 10 85g',
    category: 'Kebersihan',
    buyPrice: 3800,
    sellPrice: 5000,
    stock: 22,
    minStock: 6,
    unit: 'pcs',
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-012',
    barcode: '899999901012',
    name: 'Telur Ayam Negeri Segar 1kg',
    category: 'Sembako',
    buyPrice: 26000,
    sellPrice: 29000,
    stock: 18,
    minStock: 5,
    unit: 'kg',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'trx-1001',
    receiptNumber: 'TRX-20261010-001',
    timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
    items: [
      {
        product: INITIAL_PRODUCTS[0],
        quantity: 5,
        subtotal: 17500,
      },
      {
        product: INITIAL_PRODUCTS[1],
        quantity: 2,
        subtotal: 9000,
      },
      {
        product: INITIAL_PRODUCTS[8],
        quantity: 1,
        subtotal: 11000,
      },
    ],
    totalItems: 8,
    subtotal: 37500,
    discount: 0,
    tax: 0,
    grandTotal: 37500,
    totalCost: 28500,
    profit: 9000,
    paymentMethod: 'cash',
    amountPaid: 50000,
    change: 12500,
    customerName: 'Budi Santoso',
    notes: '',
    syncedToSheets: false,
  },
  {
    id: 'trx-1002',
    receiptNumber: 'TRX-20261010-002',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    items: [
      {
        product: INITIAL_PRODUCTS[3], // Bimoli
        quantity: 2,
        subtotal: 41000,
      },
      {
        product: INITIAL_PRODUCTS[4], // Gulaku
        quantity: 2,
        subtotal: 35000,
      },
      {
        product: INITIAL_PRODUCTS[11], // Telur
        quantity: 1,
        subtotal: 29000,
      },
    ],
    totalItems: 5,
    subtotal: 105000,
    discount: 5000,
    tax: 0,
    grandTotal: 100000,
    totalCost: 91000,
    profit: 9000,
    paymentMethod: 'qris',
    amountPaid: 100000,
    change: 0,
    customerName: 'Ibu Ratna',
    notes: 'Diskon langganan',
    syncedToSheets: false,
  },
  {
    id: 'trx-1003',
    receiptNumber: 'TRX-20261010-003',
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    items: [
      {
        product: INITIAL_PRODUCTS[5], // Beras
        quantity: 1,
        subtotal: 76000,
      },
      {
        product: INITIAL_PRODUCTS[2], // Teh Pucuk
        quantity: 3,
        subtotal: 13500,
      },
    ],
    totalItems: 4,
    subtotal: 89500,
    discount: 0,
    tax: 0,
    grandTotal: 89500,
    totalCost: 77600,
    profit: 11900,
    paymentMethod: 'cash',
    amountPaid: 100000,
    change: 10500,
    customerName: 'Pak Hendra',
    notes: '',
    syncedToSheets: false,
  },
];

class StorageService {
  getProducts(): Product[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (!data) {
        this.saveProducts(INITIAL_PRODUCTS);
        return INITIAL_PRODUCTS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_PRODUCTS;
    }
  }

  saveProducts(products: Product[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error('Failed to save products:', e);
    }
  }

  addProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
    const products = this.getProducts();
    const newProduct: Product = {
      ...product,
      id: 'prod-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    products.unshift(newProduct);
    this.saveProducts(products);

    this.logStockMovement({
      productId: newProduct.id,
      productName: newProduct.name,
      type: 'in',
      quantity: newProduct.stock,
      previousStock: 0,
      newStock: newProduct.stock,
      notes: 'Stok awal produk baru',
    });

    return newProduct;
  }

  updateProduct(id: string, updates: Partial<Product>): Product | null {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const oldProduct = products[index];
    const updated: Product = {
      ...oldProduct,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (updates.stock !== undefined && updates.stock !== oldProduct.stock) {
      const diff = updates.stock - oldProduct.stock;
      this.logStockMovement({
        productId: id,
        productName: updated.name,
        type: diff > 0 ? 'in' : 'out',
        quantity: Math.abs(diff),
        previousStock: oldProduct.stock,
        newStock: updates.stock,
        notes: updates.stock > oldProduct.stock ? 'Penambahan stok manual' : 'Pengurangan stok manual',
      });
    }

    products[index] = updated;
    this.saveProducts(products);
    return updated;
  }

  deleteProduct(id: string): boolean {
    const products = this.getProducts();
    const filtered = products.filter((p) => p.id !== id);
    if (filtered.length !== products.length) {
      this.saveProducts(filtered);
      return true;
    }
    return false;
  }

  adjustStock(productId: string, quantityChange: number, notes: string): Product | null {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === productId);
    if (index === -1) return null;

    const prod = products[index];
    const previousStock = prod.stock;
    const newStock = Math.max(0, previousStock + quantityChange);

    prod.stock = newStock;
    prod.updatedAt = new Date().toISOString();
    products[index] = prod;
    this.saveProducts(products);

    this.logStockMovement({
      productId: prod.id,
      productName: prod.name,
      type: quantityChange >= 0 ? 'in' : 'out',
      quantity: Math.abs(quantityChange),
      previousStock,
      newStock,
      notes: notes || (quantityChange >= 0 ? 'Restock barang' : 'Penyesuaian stok'),
    });

    return prod;
  }

  findProductByBarcode(barcode: string): Product | undefined {
    const trimmed = barcode.trim().toLowerCase();
    const products = this.getProducts();
    return products.find(
      (p) => p.barcode.trim().toLowerCase() === trimmed
    );
  }

  getTransactions(): Transaction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (!data) {
        this.saveTransactions(INITIAL_TRANSACTIONS);
        return INITIAL_TRANSACTIONS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  }

  saveTransactions(transactions: Transaction[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    } catch (e) {
      console.error('Failed to save transactions:', e);
    }
  }

  recordTransaction(
    items: CartItem[],
    paymentMethod: Transaction['paymentMethod'],
    amountPaid: number,
    discount = 0,
    customerName = '',
    notes = '',
    explicitTax?: number
  ): Transaction {
    const products = this.getProducts();
    const profile = this.getStoreProfile();

    let subtotal = 0;
    let totalCost = 0;
    let totalItems = 0;

    // Deduct stock for each product
    items.forEach((item) => {
      subtotal += item.subtotal;
      totalCost += item.product.buyPrice * item.quantity;
      totalItems += item.quantity;

      const pIdx = products.findIndex((p) => p.id === item.product.id);
      if (pIdx !== -1) {
        const prev = products[pIdx].stock;
        const nStock = Math.max(0, prev - item.quantity);
        products[pIdx].stock = nStock;
        products[pIdx].updatedAt = new Date().toISOString();

        this.logStockMovement({
          productId: item.product.id,
          productName: item.product.name,
          type: 'sale',
          quantity: item.quantity,
          previousStock: prev,
          newStock: nStock,
          notes: 'Penjualan Kasir',
        });
      }
    });

    this.saveProducts(products);

    const discountedSubtotal = Math.max(0, subtotal - discount);
    const tax =
      explicitTax !== undefined
        ? explicitTax
        : profile.taxEnabled
        ? Math.round((discountedSubtotal * profile.taxRate) / 100)
        : 0;
    const grandTotal = discountedSubtotal + tax;
    const profit = discountedSubtotal - totalCost;
    const change = Math.max(0, amountPaid - grandTotal);

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const currentTxCount = this.getTransactions().length + 1;
    const receiptNumber = `TRX-${dateStr}-${currentTxCount.toString().padStart(3, '0')}`;

    const newTx: Transaction = {
      id: 'tx-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      receiptNumber,
      timestamp: new Date().toISOString(),
      items,
      totalItems,
      subtotal,
      discount,
      tax,
      grandTotal,
      totalCost,
      profit,
      paymentMethod,
      amountPaid,
      change,
      customerName,
      notes,
      syncedToSheets: false,
    };

    const txs = this.getTransactions();
    txs.unshift(newTx);
    this.saveTransactions(txs);

    return newTx;
  }

  getStoreProfile(): StoreProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (!data) {
        this.saveStoreProfile(INITIAL_PROFILE);
        return INITIAL_PROFILE;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_PROFILE;
    }
  }

  saveStoreProfile(profile: StoreProfile): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to save store profile:', e);
    }
  }

  getStockMovements(): StockMovement[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STOCK_LOGS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  logStockMovement(movement: Omit<StockMovement, 'id' | 'timestamp'>): void {
    try {
      const logs = this.getStockMovements();
      const newLog: StockMovement = {
        ...movement,
        id: 'mov-' + Date.now().toString(36),
        timestamp: new Date().toISOString(),
      };
      logs.unshift(newLog);
      // Keep recent 200 logs
      if (logs.length > 200) logs.pop();
      localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to log stock movement:', e);
    }
  }

  resetToDefaultData(): void {
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.STOCK_LOGS);
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    this.saveProducts(INITIAL_PRODUCTS);
    this.saveTransactions(INITIAL_TRANSACTIONS);
    this.saveStoreProfile(INITIAL_PROFILE);
  }

  exportAllDataJson(): string {
    return JSON.stringify(
      {
        products: this.getProducts(),
        transactions: this.getTransactions(),
        profile: this.getStoreProfile(),
        stockLogs: this.getStockMovements(),
        exportedAt: new Date().toISOString(),
        version: '1.0',
      },
      null,
      2
    );
  }

  importAllDataJson(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data.products)) this.saveProducts(data.products);
      if (Array.isArray(data.transactions)) this.saveTransactions(data.transactions);
      if (data.profile) this.saveStoreProfile(data.profile);
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }
}

export const storageService = new StorageService();
