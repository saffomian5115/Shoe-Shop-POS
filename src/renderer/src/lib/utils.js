import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount) {
  return `Rs. ${Number(amount).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function generateBarcode() {
  const chars = '0123456789'
  let barcode = ''
  for (let i = 0; i < 12; i++) {
    barcode += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return barcode
}
