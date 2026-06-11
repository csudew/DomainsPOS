import type { Order, LoyaltyCustomer } from '@/types'
import { printerConnected, printEscPos } from './thermalPrinter'

const PAYMENT_LABELS: Record<string, string> = {
  cash:           'Cash',
  credit_card:    'Credit Card',
  debit_card:     'Debit Card',
  digital_wallet: 'Digital Wallet',
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(n)

function buildHtml(
  order: Order,
  paymentMethod: string,
  loyaltyCustomer: LoyaltyCustomer | null,
  pointsEarned: number,
): string {
  const date = new Date(order.created_at)
  const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const items = order.items ?? []

  const itemRows = items
    .map(item => {
      const name = item.product?.name ?? 'Item'
      // Truncate name to fit 80mm line (~32 chars for name col)
      const displayName = name.length > 28 ? name.slice(0, 26) + '..' : name
      return `
        <tr>
          <td class="item-name">${escHtml(displayName)}</td>
          <td class="item-qty">${item.quantity}</td>
          <td class="item-price">${fmt(item.total_price)}</td>
        </tr>`
    })
    .join('')

  const loyaltySection =
    order.customer_phone && pointsEarned > 0
      ? `<div class="separator dashed"></div>
         <div class="loyalty">
           <div>&#9733; Loyalty Points Earned: <b>+${pointsEarned}</b></div>
           ${loyaltyCustomer?.tier ? `<div>Status: <b>${escHtml(loyaltyCustomer.tier.name)}</b> &mdash; ${loyaltyCustomer.total_points + pointsEarned} pts total</div>` : ''}
         </div>`
      : order.customer_phone
        ? `<div class="separator dashed"></div>
           <div class="loyalty">Points will be credited to ${escHtml(order.customer_phone)}</div>`
        : ''

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Receipt #${order.order_number}</title>
<style>
  @page { size: 80mm auto; margin: 3mm 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 74mm;
    margin: 0 auto;
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    line-height: 1.45;
    color: #000;
  }
  .center { text-align: center; }
  .right  { text-align: right; }
  .bold   { font-weight: bold; }
  .lg     { font-size: 15px; }
  .sm     { font-size: 10px; }
  .separator { border: none; border-top: 1px solid #000; margin: 5px 0; }
  .separator.dashed { border-top: 1px dashed #000; }
  .separator.double { border-top: 3px double #000; margin: 6px 0; }
  .header { margin-bottom: 4px; }
  .meta   { margin-bottom: 2px; }
  table   { width: 100%; border-collapse: collapse; }
  thead tr { border-bottom: 1px dashed #000; }
  th { font-weight: bold; padding: 3px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  .th-name  { text-align: left; }
  .th-qty   { text-align: center; width: 20px; }
  .th-price { text-align: right; }
  td { padding: 2px 0; vertical-align: top; }
  .item-name  { max-width: 150px; word-break: break-word; }
  .item-qty   { text-align: center; }
  .item-price { text-align: right; white-space: nowrap; }
  .totals td  { padding: 1px 0; }
  .grand td   { font-weight: bold; font-size: 15px; padding-top: 3px; }
  .loyalty    { font-size: 10px; text-align: center; padding: 3px 0; }
  .footer     { font-size: 10px; text-align: center; padding: 4px 0 2px; }
</style>
</head>
<body>

<div class="header center">
  <div class="bold lg">DOMINOS RESTAURANT</div>
  <div class="sm">Takeaway Receipt</div>
</div>

<div class="separator double"></div>

<div class="meta">
  <div><b>Order #:</b> ${escHtml(order.order_number)}</div>
  <div>${dateStr} &nbsp; ${timeStr}</div>
  ${order.customer_phone ? `<div><b>Customer:</b> ${escHtml(order.customer_phone)}</div>` : ''}
  <div><b>Payment:</b> ${escHtml(PAYMENT_LABELS[paymentMethod] ?? paymentMethod)}</div>
</div>

<div class="separator dashed"></div>

<table>
  <thead>
    <tr>
      <th class="th-name">Item</th>
      <th class="th-qty">Qty</th>
      <th class="th-price">Amount</th>
    </tr>
  </thead>
  <tbody>
    ${itemRows}
  </tbody>
</table>

<div class="separator dashed"></div>

<table class="totals">
  <tr><td>Subtotal</td><td class="right">${fmt(order.subtotal)}</td></tr>
  <tr><td>Tax (10%)</td><td class="right">${fmt(order.tax_amount)}</td></tr>
  ${order.discount_amount > 0 ? `<tr><td>Discount</td><td class="right">-${fmt(order.discount_amount)}</td></tr>` : ''}
</table>

<div class="separator double"></div>

<table class="totals grand">
  <tr><td>TOTAL</td><td class="right">${fmt(order.total_amount)}</td></tr>
</table>

${loyaltySection}

<div class="separator dashed"></div>
<div class="footer">
  <div>Thank you for your order!</div>
  <div class="sm" style="margin-top:2px">Please keep this receipt for your records</div>
</div>
<br>

</body>
</html>`
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Print a receipt.
 * - If a thermal printer is connected via Web Serial → sends ESC/POS bytes (no dialog).
 * - Otherwise → CSS iframe fallback (browser print dialog).
 */
export function printReceipt(
  order: Order,
  paymentMethod: string,
  loyaltyCustomer: LoyaltyCustomer | null = null,
): void {
  if (printerConnected()) {
    // Direct ESC/POS — no dialog
    printEscPos(order, paymentMethod, loyaltyCustomer).catch(console.error)
    return
  }

  // ── CSS / iframe fallback (shows browser print dialog) ──────────────────────
  const rate = loyaltyCustomer?.tier?.points_per_dollar ?? 1.0
  const pointsEarned = order.customer_phone
    ? Math.floor(order.total_amount * rate)
    : 0

  const html = buildHtml(order, paymentMethod, loyaltyCustomer, pointsEarned)
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;'
  document.body.appendChild(iframe)

  const win = iframe.contentWindow
  if (!win) return

  win.document.open()
  win.document.write(html)
  win.document.close()

  setTimeout(() => {
    win.focus()
    win.print()
  }, 250)

  const cleanup = () => {
    if (document.body.contains(iframe)) document.body.removeChild(iframe)
  }
  win.addEventListener('afterprint', cleanup)
  setTimeout(cleanup, 30000)
}
