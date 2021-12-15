import Semaphore from './vendor/semaphore.js';
import * as util from './util.js';
import {
  AssetSale, AtomicAsset, AtomicListing, AtomicSale, RowView,
} from './types.js';
import { bindLinks } from './view.js';

const sem = new Semaphore(5, 30, 15);

interface AtomicSaleResponse {
  assets: Record<string, any>[]
  collection_name: string,
  sale_id: string;
  seller: string,
  updated_at_time: string,
  price: Record<string, any>
}

async function atomicFetch(url: string, status: (msg?: string) => void): Promise<Response> {
  await sem.wait();
  let response: Response = await fetch(url);

  while (response.status === 429) {
    status('AtomicHub rate limit reached. Pausing updates.');
    await util.sleep(5 * 1000);
    response = await fetch(url);
    status();
  }

  await sem.release();
  return response;
}

/**
 * Get latest USD value of WAXP
 */
export async function getWAXPrice(): Promise<number> {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=WAX&vs_currencies=USD';
  const response = await fetch(url);
  const data = await response.json();
  return Number(data.wax.usd);
}

export async function getTemplateData(
  templateId: string,
  status: (msg?: string | undefined) => void,
): Promise<AtomicAsset> {
  const url = `https://wax.api.atomicassets.io/atomicassets/v1/templates?ids=${templateId}&page=1&limit=1&order=desc&sort=created`;
  const response = await atomicFetch(url, status);
  const data = await response.json();
  const template = data.data[0];

  return {
    collectionName: template.collection.collection_name,
    assetName: template.name,
    rarity: template.immutable_data.rarity,
    schemaName: template.schema.schema_name,
    templateId,
    timestamp: new Date(Number(template.created_at_time)),
    fetchDate: new Date(),
  };
}

export async function getWalletTemplateIds(
  wallet: string,
  status: (msg?: string | undefined) => void,
  type = 'sales',
  sort = 'updated',
  sortOrder = 'desc',

): Promise<number[]> {
  let url: string;

  if (type === 'sales') {
    url = `https://wax.api.atomicassets.io/atomicmarket/v1/sales?state=1&max_assets=1&seller=${wallet}&page=1&limit=30&order=${sortOrder}&sort=${sort}`;
  } else if (type === 'assets') {
    url = `https://wax.api.atomicassets.io/atomicmarket/v1/assets?owner=${wallet}&page=1&limit=50&order=${sortOrder}&sort=${sort}`;
  } else {
    throw new Error(`Unknown type ${type}`);
  }

  const response = await atomicFetch(url, status);
  const data = await response.json();
  if (!data || data.data.length === 0) {
    return [];
  }

  const filtered: number[] = data.data
    .map((t: AtomicSaleResponse) => {
      const asset = (t.assets) ? t.assets[0] : t;
      return Number(asset.template?.template_id);
    })
    .filter((id: number) => Number.isInteger(id));

  const unique = [...new Set(filtered)];
  return unique.slice(0, 20);
}

export async function getLastSold(
  templateId: string,
  status: (msg?: string | undefined) => void,
): Promise<AtomicSale> {
  const assetCount = 5;
  const url = `https://wax.api.atomicassets.io/atomicmarket/v1/sales?symbol=WAX&state=3&max_assets=1&template_id=${templateId}&page=1&limit=${assetCount}&order=desc&sort=updated`;
  const response = await atomicFetch(url, status);
  const data = await response.json();

  if (!data || !data.data || data.data.length === 0) {
    return {
      increasing: 0,
      lastPrice: undefined,
      lastSoldDate: new Date(0),
      schemaName: '',
      templateId,
      priceHistory: [],
      timestamp: new Date(),
      fetchDate: new Date(),
    };
  }

  const last = data.data[0];

  const priceHistory: AssetSale[] = data.data.map((d: AtomicSaleResponse) => ({
    date: new Date(Number(d.updated_at_time)),
    id: last.sale_id,
    price: util.parseTokenValue(d.price.token_precision, d.price.amount),
    seller: d.seller,
  })).reverse();

  const prices: number[] = priceHistory.map((p) => p.price);
  let increases = 0;
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] >= prices[i - 1]) {
      increases += 1;
    }
  }

  const asset = last.assets[0];

  return {
    assetName: asset.template.immutable_data.name || asset.schema.schema_name,
    collectionName: last.collection_name,
    lastPrice: util.parseTokenValue(last.price.token_precision, last.price.amount),
    lastSoldDate: new Date(Number(last.updated_at_time)),
    increasing: increases / (prices.length - 1),
    priceHistory,
    rarity: asset.template.immutable_data.rarity,
    schemaName: asset.schema.schema_name,
    templateId,
    timestamp: new Date(Number(asset.updated_at_time)),
    fetchDate: new Date(),
  };
}

export async function getFloorListing(
  templateId: string,
  status: (msg?: string | undefined) => void,
): Promise<AtomicListing> {
  const url = `https://wax.api.atomicassets.io/atomicmarket/v1/sales?symbol=WAX&state=1&max_assets=1&template_id=${templateId}&page=1&limit=5&order=asc&sort=price`;
  const response = await atomicFetch(url, status);

  const data = await response.json();
  if (data.data.length === 0) {
    return {
      floorPrice: undefined,
      mintNumber: 0,
      seller: '',
      templateId,
      timestamp: new Date(),
      fetchDate: new Date(),
      listings: [],
    };
  }

  const listings: AssetSale[] = data.data.map((floor: AtomicSaleResponse) => {
    const asset = floor.assets[0];
    return {
      date: new Date(Number(asset.updated_at_time)),
      price: util.parseTokenValue(floor.price.token_precision, floor.price.amount),
      seller: floor.seller,
      id: floor.sale_id,
    };
  });

  const floor = data.data[0];
  const asset = floor.assets[0];

  return {
    assetName: asset.template.immutable_data.name || asset.schema.schema_name,
    collectionName: floor.collection_name,
    floorPrice: util.parseTokenValue(floor.price.token_precision, floor.price.amount),
    listings,
    mintNumber: asset.template_mint,
    rarity: asset.template.immutable_data.rarity,
    schemaName: asset.schema.schema_name,
    seller: asset.seller,
    templateId,
    timestamp: new Date(Number(asset.updated_at_time)),
    fetchDate: new Date(),
  };
}

export function transform(
  lastSold: AtomicSale,
  floor: AtomicListing,
  templateId: string,
  wallet: string,
): RowView {
  let m: RowView = {
    lagHours: undefined,
    priceGapPercent: undefined,
    historyLink: '',
    listingsLink: '',
    collectionLink: '',
    templateLink: '',
    inventoryLink: '',
    schemaLink: '',
    ...lastSold,
    ...floor,
    collectionName: floor.collectionName || lastSold.collectionName,
    fetchDate: floor.fetchDate || lastSold.fetchDate,
  };

  m.lagHours = (Date.now() - m.lastSoldDate.getTime()) / 1000 / 60 / 60;

  if (m.lastPrice !== undefined && m.floorPrice !== undefined) {
    m.priceGapPercent = ((m.floorPrice - m.lastPrice) / m.lastPrice) * 100;
  }

  m = bindLinks(m, templateId, wallet);

  return m;
}
