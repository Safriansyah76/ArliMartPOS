import { Transaction, StoreProfile } from '../types';

/**
 * ESC/POS Command Generator for 58mm Thermal Printers (e.g., Android POS Z91)
 * Paper width: 58mm (approx 32 columns in standard 12x24 font)
 */

export class EscPosEncoder {
  private buffer: number[] = [];

  constructor() {
    this.initialize();
  }

  // Initialize printer
  initialize(): this {
    this.buffer.push(0x1b, 0x40); // ESC @
    return this;
  }

  // Text alignment: 0=Left, 1=Center, 2=Right
  align(align: 'left' | 'center' | 'right'): this {
    const val = align === 'center' ? 1 : align === 'right' ? 2 : 0;
    this.buffer.push(0x1b, 0x61, val); // ESC a n
    return this;
  }

  // Bold text: true/false
  bold(enable: boolean): this {
    this.buffer.push(0x1b, 0x45, enable ? 1 : 0); // ESC E n
    return this;
  }

  // Text size: 0=Normal, 1=Double height, 2=Double width, 3=Double width & height
  size(doubleWidth = false, doubleHeight = false): this {
    let n = 0;
    if (doubleWidth) n |= 0x20;
    if (doubleHeight) n |= 0x01;
    this.buffer.push(0x1d, 0x21, n); // GS ! n
    return this;
  }

  // Print text (encoded into CP437 or ASCII bytes)
  text(str: string): this {
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code < 128) {
        this.buffer.push(code);
      } else {
        // Fallback ASCII replacement for non-ASCII
        this.buffer.push(0x3f); // '?'
      }
    }
    return this;
  }

  line(str = ''): this {
    this.text(str);
    this.buffer.push(0x0a); // LF
    return this;
  }

  feed(lines = 1): this {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(0x0a);
    }
    return this;
  }

  // Divider line of 32 characters for 58mm paper
  divider(char = '-'): this {
    this.line(char.repeat(32));
    return this;
  }

  // Double column aligned: left text and right text totaling 32 characters
  twoColumns(left: string, right: string, width = 32): this {
    const spaceCount = width - left.length - right.length;
    if (spaceCount > 0) {
      this.line(left + ' '.repeat(spaceCount) + right);
    } else {
      // If too long, print on separate lines
      this.line(left);
      this.line(' '.repeat(Math.max(0, width - right.length)) + right);
    }
    return this;
  }

  // Paper cut (Full or Partial)
  cut(): this {
    this.feed(3);
    this.buffer.push(0x1d, 0x56, 0x42, 0x00); // GS V B 0
    return this;
  }

  // Get raw Uint8Array
  getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  getBase64(): string {
    const bytes = this.getBytes();
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

/**
 * Generate full ESC/POS bytes for receipt on 58mm printer
 */
export function buildReceiptEscPos(tx: Transaction, profile: StoreProfile): Uint8Array {
  const encoder = new EscPosEncoder();
  const formatRp = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

  // Header
  encoder
    .align('center')
    .bold(true)
    .size(true, true) // Double size store title
    .line(profile.name.toUpperCase())
    .size(false, false)
    .bold(false)
    .line(profile.address)
    .line(`Telp: ${profile.phone}`)
    .divider('=');

  // Metadata
  encoder
    .align('left')
    .twoColumns('No. Struk :', tx.receiptNumber)
    .twoColumns(
      'Waktu     :',
      new Date(tx.timestamp).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    )
    .twoColumns('Kasir     :', 'Kasir Utama')
    .twoColumns('Pelanggan :', tx.customerName || 'Umum')
    .twoColumns('Metode    :', tx.paymentMethod.toUpperCase())
    .divider('-');

  // Item List
  tx.items.forEach((item) => {
    encoder.align('left').bold(true).line(item.product.name).bold(false);

    const discInfo = item.discountPercent && item.discountPercent > 0 ? ` (-${item.discountPercent}%)` : '';
    const qtyPrice = `${item.quantity} ${item.product.unit} x ${formatRp(item.product.sellPrice)}${discInfo}`;
    const subtotal = formatRp(item.subtotal);
    encoder.twoColumns(`  ${qtyPrice}`, subtotal);
  });

  // Totals
  encoder
    .divider('-')
    .twoColumns(`Subtotal (${tx.totalItems} item)`, formatRp(tx.subtotal));

  if (tx.discount > 0) {
    encoder.twoColumns('Diskon', `-${formatRp(tx.discount)}`);
  }

  if (tx.tax > 0) {
    const discounted = Math.max(1, tx.subtotal - tx.discount);
    const effectivePct = Math.round((tx.tax / discounted) * 100) || profile.taxRate;
    encoder.twoColumns(`PPN (${effectivePct}%)`, formatRp(tx.tax));
  }

  encoder
    .divider('=')
    .bold(true)
    .twoColumns('TOTAL AKHIR', formatRp(tx.grandTotal))
    .bold(false)
    .twoColumns('Jumlah Bayar', formatRp(tx.amountPaid))
    .bold(true)
    .twoColumns('Kembalian', formatRp(tx.change))
    .bold(false)
    .divider('=');

  // Footer Message
  encoder
    .align('center')
    .line(profile.receiptFooter || 'Terima kasih atas kunjungan Anda!')
    .feed(1)
    .line('*** KASIRKU POS ***')
    .cut();

  return encoder.getBytes();
}

interface BluetoothRemoteGATTCharacteristicLike {
  properties: {
    write?: boolean;
    writeWithoutResponse?: boolean;
  };
  writeValue: (value: BufferSource) => Promise<void>;
  writeValueWithoutResponse: (value: BufferSource) => Promise<void>;
}

interface BluetoothRemoteGATTServiceLike {
  getCharacteristics: () => Promise<BluetoothRemoteGATTCharacteristicLike[]>;
}

interface BluetoothRemoteGATTServerLike {
  getPrimaryServices: () => Promise<BluetoothRemoteGATTServiceLike[]>;
}

interface BluetoothDeviceLike {
  name?: string;
  gatt?: {
    connect: () => Promise<BluetoothRemoteGATTServerLike>;
  };
}

/**
 * Print directly via Web Bluetooth to Android POS Z91 internal/Bluetooth printer
 */
export async function printViaWebBluetooth(
  tx: Transaction,
  profile: StoreProfile,
  onStatus?: (status: string) => void
): Promise<void> {
  const nav = navigator as unknown as {
    bluetooth?: {
      requestDevice: (options: unknown) => Promise<BluetoothDeviceLike>;
    };
  };

  if (!nav.bluetooth) {
    throw new Error(
      'Browser tidak mendukung Web Bluetooth. Pastikan menggunakan Chrome/Chromium di Android dan aktifkan Bluetooth.'
    );
  }

  onStatus?.('Mencari printer thermal Bluetooth (POS Z91)...');

  // Standard ESC/POS Bluetooth Printer service UUIDs
  // 0xFFE0 is the standard for 99% of POS thermal printers including Z91/Z90/MTP-II
  const device = await nav.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [
      '0000ffe0-0000-1000-8000-00805f9b34fb', // Standard SPP-over-BLE / Z91
      '000018f0-0000-1000-8000-00805f9b34fb',
      '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
    ],
  });

  onStatus?.(`Terhubung ke ${device.name || 'Printer Z91'}...`);

  if (!device.gatt) {
    throw new Error('GATT server tidak tersedia pada printer ini.');
  }

  const server = await device.gatt.connect();

  onStatus?.('Mengambil service printer thermal...');

  // Try finding the appropriate primary service
  let targetCharacteristic: BluetoothRemoteGATTCharacteristicLike | null = null;
  const services = await server.getPrimaryServices();

  for (const service of services) {
    try {
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          targetCharacteristic = char;
          break;
        }
      }
      if (targetCharacteristic) break;
    } catch {
      // Continue to next service
    }
  }

  if (!targetCharacteristic) {
    throw new Error(
      'Karakteristik write printer tidak ditemukan. Pastikan printer dalam keadaan aktif dan mendukung BLE/SPP.'
    );
  }

  onStatus?.('Mengirim data struk ke printer thermal Z91...');

  const data = buildReceiptEscPos(tx, profile);

  // Send chunks of 100 bytes to avoid BLE packet buffer overflow
  const CHUNK_SIZE = 100;
  for (let offset = 0; offset < data.byteLength; offset += CHUNK_SIZE) {
    const chunk = data.slice(offset, offset + CHUNK_SIZE);
    if (targetCharacteristic.properties.writeWithoutResponse) {
      await targetCharacteristic.writeValueWithoutResponse(chunk);
    } else {
      await targetCharacteristic.writeValue(chunk);
    }
    // Small delay between packets
    await new Promise((r) => setTimeout(r, 25));
  }

  onStatus?.('Selesai dicetak!');
}

/**
 * Print via Android RawBT / PrintBridge intent for Android POS Z91
 * Many Z91 handhelds use RawBT service installed as default print handler.
 */
export function printViaRawBT(tx: Transaction, profile: StoreProfile): void {
  const encoder = new EscPosEncoder();
  // Generate Base64 of ESC/POS bytes
  const bytes = buildReceiptEscPos(tx, profile);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Data = btoa(binary);

  // RawBT custom URI intent scheme
  const rawbtUrl = `rawbt:data:application/octet-stream;base64,${base64Data}`;
  window.location.href = rawbtUrl;
}
