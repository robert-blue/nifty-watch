export interface HasRefreshTimeout extends HTMLTableRowElement {
  refreshTimeoutId?: number
}

export interface Sortable extends HTMLTableElement {
  sort?: () => void
}

/** Recent sale data from AtomicHub */
export interface AtomicSale {
  assetName: string
  collectionName: string
  increasing: number
  lastPrice: number
  lastSoldDate: Date
  priceHistory: [{date: Date, price: number}]
  schemaName: string
}

/** Asset listed for sale on AtomicHub */
export interface AtomicListing {
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
