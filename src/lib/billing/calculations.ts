export type InvoiceLineInput = {
  quantity: string
  rateMinor: number
  gstRateBps: number
}

export type CalculatedLine = InvoiceLineInput & {
  taxableMinor: number
  cgstMinor: number
  sgstMinor: number
  igstMinor: number
  lineTotalMinor: number
}

export type InvoiceCalculationInput = {
  lines: InvoiceLineInput[]
  discountMinor?: number
  freightMinor?: number
  otherChargesMinor?: number
  intraState?: boolean
}

export type InvoiceCalculation = {
  lines: CalculatedLine[]
  subtotalMinor: number
  discountMinor: number
  freightMinor: number
  otherChargesMinor: number
  taxableValueMinor: number
  cgstMinor: number
  sgstMinor: number
  igstMinor: number
  grandTotalMinor: number
}

/**
 * Money is represented as integer minor units (paise) to avoid floating-point
 * currency errors. Quantity remains a decimal string so billing can support
 * fractional quantities without losing precision.
 */
function decimalToScaledInteger(value: string, scale = 10000): bigint {
  const normalized = value.trim()
  if (!/^\d+(\.\d+)?$/.test(normalized)) throw new Error(`Invalid quantity: ${value}`)
  const [whole, fraction = ''] = normalized.split('.')
  const fractionPart = (fraction + '0'.repeat(4)).slice(0, 4)
  return BigInt(whole) * BigInt(scale) + BigInt(fractionPart)
}

function multiplyQuantityByRate(quantity: string, rateMinor: number): number {
  const quantityScaled = decimalToScaledInteger(quantity)
  const result = (quantityScaled * BigInt(rateMinor)) / BigInt(10000)
  return Number(result)
}

function calculateTax(taxableMinor: number, gstRateBps: number): number {
  return Math.round((taxableMinor * gstRateBps) / 10000)
}

export function calculateInvoice(input: InvoiceCalculationInput): InvoiceCalculation {
  const discountMinor = Math.max(0, Math.round(input.discountMinor ?? 0))
  const freightMinor = Math.max(0, Math.round(input.freightMinor ?? 0))
  const otherChargesMinor = Math.max(0, Math.round(input.otherChargesMinor ?? 0))
  const intraState = input.intraState ?? true

  const lines = input.lines.map((line) => {
    if (!Number.isInteger(line.rateMinor) || line.rateMinor < 0) {
      throw new Error(`Invalid rate: ${line.rateMinor}`)
    }
    if (!Number.isInteger(line.gstRateBps) || line.gstRateBps < 0) {
      throw new Error(`Invalid GST rate: ${line.gstRateBps}`)
    }

    const taxableMinor = multiplyQuantityByRate(line.quantity, line.rateMinor)
    const totalTaxMinor = calculateTax(taxableMinor, line.gstRateBps)
    const cgstMinor = intraState ? Math.floor(totalTaxMinor / 2) : 0
    const sgstMinor = intraState ? totalTaxMinor - cgstMinor : 0
    const igstMinor = intraState ? 0 : totalTaxMinor

    return {
      ...line,
      taxableMinor,
      cgstMinor,
      sgstMinor,
      igstMinor,
      lineTotalMinor: taxableMinor + totalTaxMinor,
    }
  })

  const subtotalMinor = lines.reduce((sum, line) => sum + line.taxableMinor, 0)
  const taxableValueMinor = Math.max(0, subtotalMinor - discountMinor + freightMinor + otherChargesMinor)

  // Tax is calculated from the line-level taxable values. Any future GST rule
  // that taxes invoice-level charges should be added explicitly rather than
  // silently changing this deterministic calculation.
  const cgstMinor = lines.reduce((sum, line) => sum + line.cgstMinor, 0)
  const sgstMinor = lines.reduce((sum, line) => sum + line.sgstMinor, 0)
  const igstMinor = lines.reduce((sum, line) => sum + line.igstMinor, 0)
  const grandTotalMinor = Math.max(0, subtotalMinor - discountMinor + freightMinor + otherChargesMinor + cgstMinor + sgstMinor + igstMinor)

  return {
    lines,
    subtotalMinor,
    discountMinor,
    freightMinor,
    otherChargesMinor,
    taxableValueMinor,
    cgstMinor,
    sgstMinor,
    igstMinor,
    grandTotalMinor,
  }
}
