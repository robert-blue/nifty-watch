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
}

/** Recent sale data from AtomicHub */
export interface AtomicSale extends AtomicAsset {
  increasing: number
  lastPrice: number
  lastSoldDate: Date
  priceHistory?: [{date: Date, price: number}]
}

/** Asset listed for sale on AtomicHub */
export interface AtomicListing extends AtomicAsset {
  floorPrice: number
  mintNumber: number
}

/** Composite model of asset data retrieved from AtomicHub.io */
export interface AtomicModel extends AtomicListing, AtomicSale {
  lagHours: number
  templateLink: string
  priceGapPercent: number
  inventoryLink: string
  historyLink: string
  listingsLink: string
  collectionLink: string
  templateId: string
}
