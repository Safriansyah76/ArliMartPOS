import jsPDF from 'jspdf';
import { Transaction, StoreProfile } from '../types';

/**
 * Generate PDF receipt formatted specifically as a 58mm thermal receipt
 */
export function generateReceiptPdf(tx: Transaction, profile: StoreProfile): jsPDF {
  const formatRp = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

  // Estimate required height in mm based on items count
  // 58mm roll width: base height ~ 110mm + 8mm per item
  const estimatedHeight = Math.max(140, 100 + tx.items.length * 9);

  // Create jsPDF instance with custom page size (58mm width x dynamic height)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [58, estimatedHeight],
  });

  const pageWidth = 58;
  const margin = 4;
  const contentWidth = pageWidth - margin * 2;
  let y = 7;

  // Helper for centered text
  const printCenter = (text: string, fontSize = 8, isBold = false) => {
    doc.setFont('courier', isBold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    doc.text(text, pageWidth / 2, y, { align: 'center' });
    y += fontSize * 0.45;
  };

  // Helper for left-right columns
  const printRow = (left: string, right: string, fontSize = 7, isBold = false) => {
    doc.setFont('courier', isBold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    doc.text(left, margin, y);
    doc.text(right, pageWidth - margin, y, { align: 'right' });
    y += fontSize * 0.45;
  };

  // Helper for dotted/dashed divider line
  const printDivider = (char = '-') => {
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    const lineStr = char.repeat(32);
    doc.text(lineStr, pageWidth / 2, y, { align: 'center' });
    y += 3;
  };

  // 1. Store Header
  printCenter(profile.name.toUpperCase(), 10, true);
  y += 0.5;
  printCenter(profile.address, 6.5, false);
  printCenter(`Telp: ${profile.phone}`, 6.5, false);
  y += 1;
  printDivider('=');

  // 2. Receipt Metadata
  printRow('No. Struk', tx.receiptNumber, 6.5, true);
  printRow(
    'Waktu',
    new Date(tx.timestamp).toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    6.5,
    false
  );
  printRow('Kasir', 'Kasir Utama', 6.5, false);
  printRow('Pelanggan', tx.customerName || 'Umum', 6.5, false);
  printRow('Metode', tx.paymentMethod.toUpperCase(), 6.5, false);
  printDivider('-');

  // 3. Item List
  tx.items.forEach((item) => {
    // Product title (truncate if exceeds line width)
    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    const splitTitle = doc.splitTextToSize(item.product.name, contentWidth);
    doc.text(splitTitle, margin, y);
    y += splitTitle.length * 3;

    // Quantity x Price and Subtotal
    const discInfo = item.discountPercent && item.discountPercent > 0 ? ` (Disc ${item.discountPercent}%)` : '';
    const qtyPrice = `  ${item.quantity} ${item.product.unit} x ${formatRp(item.product.sellPrice)}${discInfo}`;
    const subtotal = formatRp(item.subtotal);
    printRow(qtyPrice, subtotal, 6.5, false);
    y += 0.5;
  });

  // 4. Totals Breakdown
  printDivider('-');
  printRow(`Subtotal (${tx.totalItems} item)`, formatRp(tx.subtotal), 6.5, false);

  if (tx.discount > 0) {
    printRow('Diskon Promo', `-${formatRp(tx.discount)}`, 6.5, false);
  }

  if (tx.tax > 0) {
    const discounted = Math.max(1, tx.subtotal - tx.discount);
    const effectivePct = Math.round((tx.tax / discounted) * 100) || profile.taxRate;
    printRow(`PPN (${effectivePct}%)`, formatRp(tx.tax), 6.5, false);
  }

  printDivider('=');
  printRow('TOTAL AKHIR', formatRp(tx.grandTotal), 8.5, true);
  y += 0.5;
  printRow('Jumlah Bayar', formatRp(tx.amountPaid), 7, false);
  printRow('Kembalian', formatRp(tx.change), 7.5, true);
  printDivider('=');

  // 5. Footer Message
  y += 1;
  doc.setFont('courier', 'normal');
  doc.setFontSize(6);
  const footerLines = doc.splitTextToSize(
    profile.receiptFooter || 'Terima kasih atas kunjungan Anda!',
    contentWidth
  );
  doc.text(footerLines, pageWidth / 2, y, { align: 'center' });
  y += footerLines.length * 2.8 + 2;

  printCenter('*** KASIRKU POS ***', 5.5, false);

  return doc;
}

/**
 * Trigger immediate download of Receipt PDF
 */
export function downloadReceiptPdf(tx: Transaction, profile: StoreProfile): void {
  const doc = generateReceiptPdf(tx, profile);
  doc.save(`Struk_${tx.receiptNumber}.pdf`);
}

/**
 * Open Receipt PDF in new browser tab for preview/printing
 */
export function openReceiptPdfPreview(tx: Transaction, profile: StoreProfile): void {
  const doc = generateReceiptPdf(tx, profile);
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);
  window.open(blobUrl, '_blank');
}
