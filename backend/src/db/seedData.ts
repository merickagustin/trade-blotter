import type { NewTrade } from '../models/trade.js'

const SYMBOLS = [
  { symbol: 'AAPL', basePrice: 227 },
  { symbol: 'MSFT', basePrice: 534 },
  { symbol: 'TSLA', basePrice: 342 },
  { symbol: 'GOOGL', basePrice: 175 },
  { symbol: 'AMZN', basePrice: 205 },
  { symbol: 'META', basePrice: 612 },
  { symbol: 'NVDA', basePrice: 138 },
  { symbol: 'JPM', basePrice: 245 },
  { symbol: 'BAC', basePrice: 44 },
  { symbol: 'WMT', basePrice: 92 },
  { symbol: 'DIS', basePrice: 112 },
  { symbol: 'NFLX', basePrice: 890 },
  { symbol: 'INTC', basePrice: 31 },
  { symbol: 'AMD', basePrice: 168 },
  { symbol: 'ORCL', basePrice: 178 },
  { symbol: 'CSCO', basePrice: 62 },
  { symbol: 'ADBE', basePrice: 512 },
  { symbol: 'CRM', basePrice: 328 },
  { symbol: 'KO', basePrice: 68 },
  { symbol: 'PEP', basePrice: 156 },
  { symbol: 'V', basePrice: 312 },
  { symbol: 'MA', basePrice: 498 },
  { symbol: 'UNH', basePrice: 588 },
  { symbol: 'HD', basePrice: 402 },
  { symbol: 'BA', basePrice: 178 },
]

const TRADERS = [
  'JSMITH', 'ABROWN', 'MJONES', 'KPATEL', 'RLEE', 'TWONG', 'SODONNELL',
  'DKUMAR', 'LGARCIA', 'EWALSH', 'NCHEN', 'PSMITH', 'HFISCHER', 'CROSSI',
]

const BOOKS = [
  'EQUITIES_UK', 'EQUITIES_US', 'EQUITIES_EU', 'EQUITIES_APAC',
  'TECH_GROWTH', 'FIXED_INCOME', 'COMMODITIES', 'FX_SPOT',
  'HEDGE_STRATEGIES', 'EMERGING_MARKETS',
]

const COUNTERPARTIES = [
  'Goldman Sachs', 'JP Morgan', 'Morgan Stanley', 'Barclays', 'Citi',
  'Deutsche Bank', 'UBS', 'Credit Suisse', 'BNP Paribas', 'HSBC',
  'Bank of America', 'Wells Fargo', 'Nomura', 'Societe Generale',
]

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

// Spreads timestamps across the last `daysBack` days, keeping the time-of-day within a
// realistic trading window (08:00-17:00 UTC) rather than uniformly random across 24 hours.
function randomTimestamp(daysBack: number): string {
  const past = Date.now() - Math.random() * daysBack * 24 * 60 * 60 * 1000
  const date = new Date(past)
  date.setUTCHours(
    8 + Math.floor(Math.random() * 9),
    Math.floor(Math.random() * 60),
    Math.floor(Math.random() * 60),
  )
  // Setting a trading-hour time on "today" can land later than the current moment — push
  // back a day so seeded trades never appear to happen in the future.
  if (date.getTime() > Date.now()) date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export function generateSeedTrades(count: number): NewTrade[] {
  return Array.from({ length: count }, () => {
    const { symbol, basePrice } = randomItem(SYMBOLS)
    const variance = 1 + (Math.random() - 0.5) * 0.1 // +/- 5% around the symbol's base price

    return {
      symbol,
      side: Math.random() < 0.5 ? 'BUY' : 'SELL',
      quantity: (Math.floor(Math.random() * 100) + 1) * 100, // 100-10,000, in lots of 100
      price: Math.round(basePrice * variance * 100) / 100,
      trader: randomItem(TRADERS),
      book: randomItem(BOOKS),
      counterparty: randomItem(COUNTERPARTIES),
      tradeTimestamp: randomTimestamp(30),
    }
  })
}
