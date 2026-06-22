import { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine, BarcodeType } from 'node-thermal-printer'

let printer = null
let currentPrinterName = ''

export function getPrinter(printerName) {
  if (!printerName) {
    return null
  }
  if (!printer || currentPrinterName !== printerName) {
    printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: `printer:${printerName}`,
      options: {
        timeout: 5000
      },
      width: 48,
      characterSet: CharacterSet.PC852_LATIN2,
      breakLine: BreakLine.WORD
    })
    currentPrinterName = printerName
  }
  return printer
}

export function generateReceiptContent({ shopInfo, sale, items }) {
  const lines = []
  const lineWidth = 48

  const center = (text) => {
    const padding = Math.max(0, Math.floor((lineWidth - text.length) / 2))
    return ' '.repeat(padding) + text
  }

  const rightAlign = (text) => {
    return ' '.repeat(Math.max(0, lineWidth - text.length)) + text
  }

  const leftRight = (left, right) => {
    const spaces = Math.max(1, lineWidth - left.length - right.length)
    return left + ' '.repeat(spaces) + right
  }

  // Header
  lines.push('')
  lines.push(center(shopInfo.shop_name || 'My Shoe Shop'))
  if (shopInfo.address) lines.push(center(shopInfo.address))
  if (shopInfo.phone) lines.push(center(`Tel: ${shopInfo.phone}`))
  if (shopInfo.receipt_header) lines.push('')
  if (shopInfo.receipt_header) lines.push(center(shopInfo.receipt_header))
  lines.push('')
  lines.push('='.repeat(lineWidth))
  lines.push(`Bill: ${sale.bill_no}`)
  lines.push(`Date: ${new Date(sale.created_at).toLocaleString('en-PK')}`)
  if (sale.customer_name) lines.push(`Customer: ${sale.customer_name}`)
  if (sale.customer_phone) lines.push(`Phone: ${sale.customer_phone}`)
  lines.push('='.repeat(lineWidth))

  // Header row
  lines.push(leftRight('Item', 'Qty Price'))
  lines.push('-'.repeat(lineWidth))

  // Items
  for (const item of items) {
    const name = item.product_name.length > 22 ? item.product_name.substring(0, 20) + '..' : item.product_name
    const qtyPrice = `${item.quantity} x ${item.unit_price.toLocaleString('en-PK')}`
    lines.push(leftRight(name, qtyPrice))
    const subtotal = `Rs. ${item.subtotal.toLocaleString('en-PK')}`
    lines.push(rightAlign(subtotal))
    lines.push('')
  }

  lines.push('-'.repeat(lineWidth))

  // Totals
  lines.push(leftRight('Subtotal:', `Rs. ${sale.total_amount.toLocaleString('en-PK')}`))
  if (sale.discount_amount > 0) {
    lines.push(leftRight('Discount:', `-Rs. ${sale.discount_amount.toLocaleString('en-PK')}`))
  }
  lines.push(leftRight('Total:', `Rs. ${sale.net_amount.toLocaleString('en-PK')}`))
  lines.push(leftRight('Payment:', sale.payment_type === 'cash' ? 'Cash' : sale.payment_type === 'card' ? 'Card' : 'Split'))
  lines.push('='.repeat(lineWidth))

  // Footer
  if (shopInfo.receipt_footer) {
    lines.push('')
    lines.push(center(shopInfo.receipt_footer))
  }
  lines.push('')
  lines.push(center('Thank you for shopping!'))
  lines.push('')
  lines.push(center('--- Powered by ShoeShop POS ---'))
  lines.push('')
  lines.push('')
  lines.push('')

  return lines.join('\n')
}

export async function printReceipt(receiptText, printerName) {
  try {
    const p = getPrinter(printerName)
    if (!p) {
      return { success: false, error: `Printer "${printerName}" not configured` }
    }

    const isConnected = await p.isPrinterConnected()
    if (!isConnected) {
      return { success: false, error: `Printer "${printerName}" is not connected or turned on` }
    }

    p.clear()
    p.println(receiptText)
    p.cut()

    const result = await p.execute()
    return { success: true, message: 'Receipt printed successfully' }
  } catch (error) {
    console.error('Print error:', error)
    return { success: false, error: error.message }
  }
}

export async function printBarcodeLabel(barcode, productName, price, printerName, copies = 1) {
  try {
    const p = getPrinter(printerName)
    if (!p) {
      return { success: false, error: `Printer "${printerName}" not configured` }
    }

    const isConnected = await p.isPrinterConnected()
    if (!isConnected) {
      return { success: false, error: 'Printer not connected' }
    }

    for (let i = 0; i < copies; i++) {
      p.clear()
      p.println(productName)
      p.println(`Price: Rs. ${price}`)
      p.newLine()
      // Print actual scannable CODE128 barcode
      p.printBarcode(barcode, {
        type: BarcodeType.CODE128,
        width: 2,
        height: 48,
        hriPosition: 'below',
        hriFont: 0
      })
      p.newLine()
      p.println(`Code: ${barcode}`)
      if (i < copies - 1) {
        // Feed between labels
        p.newLine()
        p.newLine()
      }
    }
    p.cut()

    const result = await p.execute()
    return { success: true, message: `${copies} barcode label(s) printed successfully` }
  } catch (error) {
    console.error('Barcode print error:', error)
    return { success: false, error: error.message }
  }
}
