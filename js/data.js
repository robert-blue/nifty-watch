var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import Semaphore from './vendor/semaphore.js';
import * as util from './util.js';
import { bindLinks } from './view.js';
const sem = new Semaphore(5, 30, 15);
function atomicFetch(url, status) {
    return __awaiter(this, void 0, void 0, function* () {
        yield sem.wait();
        let response = yield fetch(url);
        while (response.status === 429) {
            status('AtomicHub rate limit reached. Pausing updates.');
            yield util.sleep(5 * 1000);
            response = yield fetch(url);
            status();
        }
        yield sem.release();
        return response;
    });
}
/**
 * Get latest USD value of WAXP
 */
export function getWAXPrice() {
    return __awaiter(this, void 0, void 0, function* () {
        const url = 'https://api.coingecko.com/api/v3/simple/price?ids=WAX&vs_currencies=USD';
        const response = yield fetch(url);
        const data = yield response.json();
        return Number(data.wax.usd);
    });
}
export function getTemplateData(templateId, status) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `https://wax.api.atomicassets.io/atomicassets/v1/templates?ids=${templateId}&page=1&limit=1&order=desc&sort=created`;
        const response = yield atomicFetch(url, status);
        const data = yield response.json();
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
    });
}
export function getWalletSaleTemplateIds(wallet, status, sort = 'price', sortOrder = 'desc') {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `https://wax.api.atomicassets.io/atomicmarket/v1/sales?state=1&max_assets=1&seller=${wallet}&page=1&limit=30&order=${sortOrder}&sort=${sort}`;
        const response = yield atomicFetch(url, status);
        const data = yield response.json();
        if (!data || data.data.length === 0) {
            return [];
        }
        const filtered = data.data
            .map((t) => { var _a, _b; return Number((_b = (_a = t.assets[0]) === null || _a === void 0 ? void 0 : _a.template) === null || _b === void 0 ? void 0 : _b.template_id); })
            .filter((id) => Number.isInteger(id));
        const unique = [...new Set(filtered)];
        return unique.slice(0, 20);
    });
}
export function getLastSold(templateId, status) {
    return __awaiter(this, void 0, void 0, function* () {
        const assetCount = 5;
        const url = `https://wax.api.atomicassets.io/atomicmarket/v1/sales?symbol=WAX&state=3&max_assets=1&template_id=${templateId}&page=1&limit=${assetCount}&order=desc&sort=updated`;
        const response = yield atomicFetch(url, status);
        const data = yield response.json();
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
        const priceHistory = data.data.map((d) => ({
            date: new Date(Number(d.updated_at_time)),
            id: last.sale_id,
            price: util.parseTokenValue(d.price.token_precision, d.price.amount),
            seller: d.seller,
        })).reverse();
        const prices = priceHistory.map((p) => p.price);
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
    });
}
export function getFloorListing(templateId, status) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `https://wax.api.atomicassets.io/atomicmarket/v1/sales?symbol=WAX&state=1&max_assets=1&template_id=${templateId}&page=1&limit=5&order=asc&sort=price`;
        const response = yield atomicFetch(url, status);
        const data = yield response.json();
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
        const listings = data.data.map((floor) => {
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
    });
}
export function transform(lastSold, floor, templateId, wallet) {
    let m = Object.assign(Object.assign(Object.assign({ lagHours: undefined, priceGapPercent: undefined, historyLink: '', listingsLink: '', collectionLink: '', templateLink: '', inventoryLink: '', schemaLink: '' }, lastSold), floor), { collectionName: floor.collectionName || lastSold.collectionName, fetchDate: floor.fetchDate || lastSold.fetchDate });
    m.lagHours = (Date.now() - m.lastSoldDate.getTime()) / 1000 / 60 / 60;
    if (m.lastPrice !== undefined && m.floorPrice !== undefined) {
        m.priceGapPercent = ((m.floorPrice - m.lastPrice) / m.lastPrice) * 100;
    }
    m = bindLinks(m, templateId, wallet);
    return m;
}
//# sourceMappingURL=data.js.map