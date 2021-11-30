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
const sem = new Semaphore(30, 30, 15);
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
export function getLastSold(templateId, status) {
    return __awaiter(this, void 0, void 0, function* () {
        const assetCount = 5;
        const url = `https://wax.api.atomicassets.io/atomicmarket/v1/sales?symbol=WAX&state=3&max_assets=1&template_id=${templateId}&page=1&limit=${assetCount}&order=desc&sort=updated`;
        const response = yield atomicFetch(url, status);
        const data = yield response.json();
        if (!data || !data.data || data.data.length === 0) {
            return {
                assetName: 'no sales',
                collectionName: 'unknown',
                increasing: 0,
                lastPrice: 0,
                lastSoldDate: new Date(0),
                schemaName: '',
            };
        }
        const last = data.data[0];
        const priceHistory = data.data.map((d) => ({
            date: new Date(Number(d.updated_at_time)),
            price: util.parseTokenValue(d.price.token_precision, d.price.amount),
        })).reverse();
        const prices = priceHistory.map((p) => p.price);
        let increases = 0;
        for (let i = 1; i < prices.length; i++) {
            if (prices[i] >= prices[i - 1]) {
                increases += 1;
            }
        }
        return {
            assetName: last.assets[0].name,
            collectionName: last.collection_name,
            lastPrice: util.parseTokenValue(last.price.token_precision, last.price.amount),
            lastSoldDate: new Date(Number(last.updated_at_time)),
            increasing: increases / (prices.length - 1),
            priceHistory,
            schemaName: last.assets[0].schema.schema_name,
        };
    });
}
export function getFloorListing(templateId, status) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `https://wax.api.atomicassets.io/atomicmarket/v1/sales/templates?symbol=WAX&state=1&max_assets=1&template_id=${templateId}&order=asc&sort=price`;
        const response = yield atomicFetch(url, status);
        const data = yield response.json();
        const floor = data.data[0];
        const m = {
            floorPrice: 0,
            mintNumber: 0,
        };
        if (!floor) {
            return m;
        }
        return {
            floorPrice: util.parseTokenValue(floor.price.token_precision, floor.price.amount),
            mintNumber: floor.assets[0].template_mint,
        };
    });
}
export function transform(lastSold, floor, templateId, wallet) {
    const m = Object.assign(Object.assign({ lagHours: 0, priceGapPercent: 0, historyLink: '', listingsLink: '', collectionLink: '', templateLink: '', inventoryLink: '', templateId }, lastSold), floor);
    m.lagHours = (Date.now() - m.lastSoldDate.getTime()) / 1000 / 60 / 60;
    m.priceGapPercent = ((m.floorPrice - m.lastPrice) / m.lastPrice) * 100;
    m.historyLink = `https://wax.atomichub.io/market/history?collection_name=${m.collectionName}&data:text.name=${m.assetName}&order=desc&schema_name=${m.schemaName}&sort=updated&symbol=WAX`;
    m.listingsLink = `https://wax.atomichub.io/market?collection_name=${m.collectionName}&data:text.name=${m.assetName}&order=asc&schema_name=${m.schemaName}&sort=price&symbol=WAX`;
    m.collectionLink = `https://wax.atomichub.io/explorer/collection/${m.collectionName}`;
    m.templateLink = `https://wax.atomichub.io/explorer/template/${m.collectionName}/${templateId}`;
    m.inventoryLink = `https://wax.atomichub.io/profile/${wallet}?collection_name=${m.collectionName}&match=${m.assetName}&order=desc&sort=transferred`;
    return m;
}
//# sourceMappingURL=data.js.map