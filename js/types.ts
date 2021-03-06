export interface TemplateRow extends HTMLTableRowElement {
  refreshTimeoutId?: number
}

export interface Sortable extends HTMLTableElement {
  sort?: () => void
}

export interface AtomicAsset {
  templateId: string
  assetName?: string
  collectionName?: string
  schemaName?: string
  rarity?: string
  timestamp: Date
  fetchDate: Date
}

export interface AssetSale {date: Date, id: string, price: number, seller: string}

/** Recent sale data from AtomicHub */
export interface AtomicSale extends AtomicAsset {
  increasing: number
  lastPrice?: number
  lastSoldDate: Date
  priceHistory: AssetSale[]
}

/** Asset listed for sale on AtomicHub */
export interface AtomicListing extends AtomicAsset {
  floorPrice?: number
  mintNumber: number
  seller: string
  listings: AssetSale[]
}

/** Composite model of asset data retrieved from AtomicHub.io */
export interface RowView extends AtomicListing, AtomicSale {
  lagHours?: number
  templateLink: string
  priceGapPercent?: number
  inventoryLink: string
  historyLink: string
  listingsLink: string
  collectionLink: string
  rarityLink?: string
  schemaLink: string;
}

export interface CacheData {
  lastSold: AtomicSale
  floorListing: AtomicListing
  timestamp?: Date
}

export interface TimeSpan {
  readonly milliseconds: number
  readonly seconds: number
  readonly minutes: number
  readonly hours: number
  readonly days: number
}
