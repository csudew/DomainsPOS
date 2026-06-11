/**
 * Thermal printer via Web Serial API (ESC/POS protocol).
 * Works with most 80mm USB thermal printers (Epson, STAR, XP-80, etc.)
 * that expose a virtual COM port (Windows: COMx, Linux: /dev/ttyUSBx, Mac: /dev/cu.*)
 *
 * Usage:
 *   1. Call connectPrinter() once (requires user gesture — shows port picker)
 *   2. Call printEscPos(order, paymentMethod, loyaltyCustomer) for each receipt
 *   3. The printer cuts the paper automatically at the end
 */

import type { Order, LoyaltyCustomer } from '@/types'

// ─── ESC/POS byte constants ───────────────────────────────────────────────────
const ESC = 0x1b
const GS  = 0x1d
const LF  = 0x0a

const CMD = {
  INIT:          [ESC, 0x40],          // Reset printer
  ALIGN_CENTER:  [ESC, 0x61, 0x01],   // Center text
  ALIGN_LEFT:    [ESC, 0x61, 0x00],   // Left-align text
  BOLD_ON:       [ESC, 0x45, 0x01],
  BOLD_OFF:      [ESC, 0x45, 0x00],
  DBLSIZE_ON:    [ESC, 0x21, 0x30],   // Double width + height
  DBLSIZE_OFF:   [ESC, 0x21, 0x00],
  DBLHEIGHT_ON:  [ESC, 0x21, 0x10],   // Double height only
  FEED_CUT:      [LF, LF, LF, GS, 0x56, 0x01],  // Feed 3 lines + partial cut
}

// 80mm printer: 42 chars/line at standard font (12×24)
const LINE_WIDTH = 42

// ─── Serial port state ────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _port: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _writer: any = null

export function printerConnected(): boolean {
  return _port !== null && _writer !== null
}

/** Opens the serial port picker and connects to the selected port. */
export async function connectPrinter(baudRate = 9600): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = navigator as any
  if (!nav.serial) {
    alert('Web Serial not supported.\nUse Google Chrome or Microsoft Edge on a desktop.')
    return false
  }
  try {
    _port = await nav.serial.requestPort({ filters: [] })
    await _port.open({ baudRate })
    _writer = _port.writable.getWriter()
    // Init command to wake the printer
    await _writer.write(new Uint8Array(CMD.INIT))
    return true
  } catch (err) {
    console.error('[Printer] Connect failed:', err)
    _port = null
    _writer = null
    return false
  }
}

export async function disconnectPrinter(): Promise<void> {
  try {
    if (_writer) { _writer.releaseLock(); _writer = null }
    if (_port)   { await _port.close(); _port = null }
  } catch {
    _port = null
    _writer = null
  }
}

/** Sends an ESC/POS receipt directly to the connected printer. */
export async function printEscPos(
  order: Order,
  paymentMethod: string,
  loyaltyCustomer: LoyaltyCustomer | null,
): Promise<boolean> {
  if (!_writer) return false
  try {
    const data = buildReceipt(order, paymentMethod, loyaltyCustomer)
    await _writer.write(data)
    return true
  } catch (err) {
    console.error('[Printer] Print failed:', err)
    // Assume port closed — reset state so UI shows disconnected
    _port = null
    _writer = null
    return false
  }
}

// ─── ESC/POS receipt builder ─────────────────────────────────────────────────

const encoder = new TextEncoder()

function b(bytes: number[]): number[] { return bytes }
function t(text: string): number[] { return Array.from(encoder.encode(text)) }
function nl(): number[] { return [LF] }
function line(text: string): number[] { return [...t(text), LF] }
function sep(ch = '-'): number[] { return line(ch.repeat(LINE_WIDTH)) }

/** Left text + right text on one line, padded to LINE_WIDTH. */
function row(left: string, right: string): number[] {
  const maxLeft = LINE_WIDTH - right.length - 1
  const l = left.length > maxLeft ? left.slice(0, maxLeft - 1) + '.' : left
  const gap = Math.max(1, LINE_WIDTH - l.length - right.length)
  return line(l + ' '.repeat(gap) + right)
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(n)

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash', credit_card: 'Credit Card', debit_card: 'Debit Card', digital_wallet: 'Digital Wallet',
}

function buildReceipt(
  order: Order,
  paymentMethod: string,
  loyaltyCustomer: LoyaltyCustomer | null,
): Uint8Array {
  const date = new Date(order.created_at)
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  const bytes: number[] = [
    // ── Header ──────────────────────────────────────────────
    ...b(CMD.INIT),
    ...b(CMD.ALIGN_CENTER),
    ...b(CMD.BOLD_ON),
    ...b(CMD.DBLSIZE_ON),
    ...line('DOMINOS'),
    ...line('RESTAURANT'),
    ...b(CMD.DBLSIZE_OFF),
    ...b(CMD.BOLD_OFF),
    ...line('Takeaway Receipt'),
    ...b(CMD.ALIGN_LEFT),

    // ── Order info ───────────────────────────────────────────
    ...sep('='),
    ...line(`Order #: ${order.order_number}`),
    ...line(`Date:    ${dateStr}  ${timeStr}`),
    ...(order.customer_phone ? line(`Phone:   ${order.customer_phone}`) : []),
    ...line(`Payment: ${PAYMENT_LABELS[paymentMethod] ?? paymentMethod}`),

    // ── Items ────────────────────────────────────────────────
    ...sep('-'),
    ...b(CMD.BOLD_ON),
    ...row('ITEM', 'QTY   AMOUNT'),
    ...b(CMD.BOLD_OFF),
    ...sep('-'),
  ]

  const items = order.items ?? []
  for (const item of items) {
    const name = item.product?.name ?? 'Item'
    const rightPart = `${String(item.quantity).padStart(3)}  ${fmt(item.total_price).padStart(7)}`
    const maxName = LINE_WIDTH - rightPart.length - 1
    const displayName = name.length > maxName ? name.slice(0, maxName - 1) + '.' : name
    const gap = Math.max(1, LINE_WIDTH - displayName.length - rightPart.length)
    bytes.push(...line(displayName + ' '.repeat(gap) + rightPart))
  }

  // ── Totals ───────────────────────────────────────────────
  bytes.push(
    ...sep('-'),
    ...row('Subtotal', fmt(order.subtotal)),
    ...row('Tax (10%)', fmt(order.tax_amount)),
    ...(order.discount_amount > 0 ? row('Discount', `-${fmt(order.discount_amount)}`) : []),
    ...sep('='),
  )

  // Grand total — double size
  bytes.push(
    ...b(CMD.BOLD_ON),
    ...b(CMD.DBLHEIGHT_ON),
    ...row('TOTAL', fmt(order.total_amount)),
    ...b(CMD.DBLHEIGHT_OFF ?? CMD.DBLSIZE_OFF),
    ...b(CMD.BOLD_OFF),
  )

  // ── Loyalty ──────────────────────────────────────────────
  if (order.customer_phone) {
    const rate = loyaltyCustomer?.tier?.points_per_dollar ?? 1.0
    const earned = Math.floor(order.total_amount * rate)
    if (earned > 0) {
      const newTotal = (loyaltyCustomer?.total_points ?? 0) + earned
      bytes.push(
        ...sep('-'),
        ...b(CMD.ALIGN_CENTER),
        ...line(`* Loyalty Points Earned: +${earned} pts`),
        ...(loyaltyCustomer?.tier
          ? line(`${loyaltyCustomer.tier.name} Member  |  ${newTotal} pts total`)
          : line('Points will be added to your account')),
        ...b(CMD.ALIGN_LEFT),
      )
    }
  }

  // ── Footer ───────────────────────────────────────────────
  bytes.push(
    ...sep('-'),
    ...b(CMD.ALIGN_CENTER),
    ...b(CMD.BOLD_ON),
    ...line('Thank you for your order!'),
    ...b(CMD.BOLD_OFF),
    ...line('Please keep this receipt'),
    ...nl(),
    ...b(CMD.ALIGN_LEFT),

    // Feed 3 lines then partial cut
    ...b(CMD.FEED_CUT),
  )

  return new Uint8Array(bytes)
}
