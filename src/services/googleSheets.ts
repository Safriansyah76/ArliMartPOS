import { Product, Transaction, StoreProfile } from '../types';

export interface ExportResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  exportedAt: string;
}

export async function exportToGoogleSheets(
  accessToken: string,
  profile: StoreProfile,
  transactions: Transaction[],
  products: Product[]
): Promise<ExportResult> {
  const dateStr = new Date().toISOString().slice(0, 10);
  const title = `KasirKu POS - ${profile.name} - ${dateStr}`;

  // 1. Create a new Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            sheetId: 0,
            title: 'Ringkasan & Penjualan',
            gridProperties: { rowCount: 1000, columnCount: 15 },
          },
        },
        {
          properties: {
            sheetId: 1,
            title: 'Inventaris & Stok',
            gridProperties: { rowCount: 1000, columnCount: 12 },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errorData = await createRes.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Gagal membuat spreadsheet (${createRes.status})`
    );
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;

  // Calculate totals
  const totalOmset = transactions.reduce((sum, t) => sum + t.grandTotal, 0);
  const totalModal = transactions.reduce((sum, t) => sum + t.totalCost, 0);
  const totalLaba = transactions.reduce((sum, t) => sum + t.profit, 0);
  const totalItemTerjual = transactions.reduce((sum, t) => sum + t.totalItems, 0);
  const totalAsetStok = products.reduce((sum, p) => sum + p.stock * p.buyPrice, 0);

  // Prepare Transactions Table
  const txRows: (string | number)[][] = [
    ['LAPORAN KASIR & PENJUALAN TOKO', '', '', '', '', '', '', '', '', ''],
    ['Nama Toko:', profile.name, '', 'Tanggal Ekspor:', new Date().toLocaleString('id-ID'), '', '', '', '', ''],
    ['Alamat:', profile.address, '', 'Kontak:', profile.phone, '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', ''],
    ['RINGKASAN KEUANGAN', '', '', '', '', '', '', '', '', ''],
    ['Total Transaksi', transactions.length, '', 'Total Omset Penjualan', totalOmset],
    ['Total Item Terjual', totalItemTerjual, '', 'Total HPP / Modal', totalModal],
    ['Total Laba Bersih', totalLaba, '', 'Total Nilai Aset Stok', totalAsetStok],
    ['', '', '', '', '', '', '', '', '', ''],
    [
      'No. Struk',
      'Waktu Transaksi',
      'Nama Pelanggan',
      'Metode Bayar',
      'Jumlah Item',
      'Subtotal (Rp)',
      'Diskon (Rp)',
      'Total Akhir (Rp)',
      'HPP Modal (Rp)',
      'Laba Bersih (Rp)',
      'Daftar Produk Dibeli',
    ],
  ];

  transactions.forEach((tx) => {
    const itemsSummary = tx.items
      .map(
        (it) =>
          `${it.product.name} (${it.quantity}x${
            it.discountPercent && it.discountPercent > 0 ? `, Disc ${it.discountPercent}%` : ''
          })`
      )
      .join(', ');

    txRows.push([
      tx.receiptNumber,
      new Date(tx.timestamp).toLocaleString('id-ID'),
      tx.customerName || 'Pelanggan Umum',
      tx.paymentMethod.toUpperCase(),
      tx.totalItems,
      tx.subtotal,
      tx.discount,
      tx.grandTotal,
      tx.totalCost,
      tx.profit,
      itemsSummary,
    ]);
  });

  // Prepare Products Table
  const productRows: (string | number)[][] = [
    ['DAFTAR INVENTARIS & STOK BARANG', '', '', '', '', '', '', '', '', ''],
    ['Toko:', profile.name, '', 'Per Tanggal:', new Date().toLocaleString('id-ID'), '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', ''],
    [
      'Barcode / SKU',
      'Nama Produk',
      'Kategori',
      'Satuan',
      'Harga Beli / Modal (Rp)',
      'Harga Jual (Rp)',
      'Sisa Stok',
      'Min. Stok',
      'Status Stok',
      'Nilai Aset Stok (Rp)',
    ],
  ];

  products.forEach((p) => {
    const status = p.stock <= 0 ? 'HABIS' : p.stock <= p.minStock ? 'MENIPIS' : 'AMAN';
    productRows.push([
      `'${p.barcode}`, // Force text so leading zeros or long numbers don't convert to scientific notation
      p.name,
      p.category,
      p.unit,
      p.buyPrice,
      p.sellPrice,
      p.stock,
      p.minStock,
      status,
      p.stock * p.buyPrice,
    ]);
  });

  // 2. Batch update values to Google Sheets
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: "'Ringkasan & Penjualan'!A1",
            values: txRows,
          },
          {
            range: "'Inventaris & Stok'!A1",
            values: productRows,
          },
        ],
      }),
    }
  );

  if (!updateRes.ok) {
    const errorData = await updateRes.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Gagal mengisi data ke Google Sheets (${updateRes.status})`
    );
  }

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    title,
    exportedAt: new Date().toISOString(),
  };
}
