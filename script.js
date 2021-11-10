const exchangeTable = document.getElementById('exchangeTable');
const refreshTableButton = document.getElementById('refreshTableButton');

// List of template IDs of NFTs to monitor
const templateIDs = [345393, 338018, 178062, 167345, 140918, 167332, 167320, 167252, 45017, 329691, 329688, 329692, 251305, 281655, 166103].sort()

async function getWAXPrice() {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=WAX&vs_currencies=USD'
    const response = await fetch(url);
    const data = await response.json();
    return data.wax.usd;
}

async function populatePage() {
    // Reset the table
    exchangeTable.innerHTML = '';

    const waxPrice = await getWAXPrice();

    for (const templateID of templateIDs) {
        console.log("TEMPLATE: ", templateID)
        const url = `https://wax.api.atomicassets.io/atomicmarket/v1/sales/templates?symbol=WAX&template_id=${templateID}&order=asc&sort=price`;
        const response = await fetch(url);
        const data = await response.json();

        // const wax = await populateWaxPrice()


        for (const d of data.data) {
            console.log("DATA:", d)

            const precision = d.price.token_precision

            const left = d.price.amount.substring(0, d.price.amount.length - precision)
            const right = d.price.amount.substring(d.price.amount.length - precision)
            const price =  parseFloat(`${left}.${right}`)

            let image = ''
            if (d.assets[0].template.immutable_data.video) {
                image = `<video autoplay="" loop="" playsinline="" style="height:5em;">
                            <source src="https://ipfs.atomichub.io/ipfs/${d.assets[0].template.immutable_data.video}">
                        </video>`
            } else {
                console.log("ELSE", d.assets[0].template.immutable_data)
                // image = `<img src="https://ipfs.atomichub.io/ipfs/${d.assets[0].template.immutable_data.img}" style="height: 5em;" />`
                // image = `<img src="https://ipfs.atomichub.io/ipfs/${d.assets[0].template.immutable_data.img}" style="height: 5em;" />`
                // image = `<img src="https://resizer.atomichub.io/images/v1/preview?ipfs=${d.assets[0].template.immutable_data.img}&size=370" />`
            }

            // const name =  d.assets[0].template.immutable_data.name
            const saleId = d.sale_id

            const collectionName = d.collection_name
            const schemaName = d.assets[0].schema.schema_name
            const cardName = d.assets[0].name

            const salesLink = `https://wax.atomichub.io/market/history?collection_name=${collectionName}&data:text.name=${cardName}&order=desc&schema_name=${schemaName}&sort=updated&symbol=WAX`
            const saleLink = `https://wax.atomichub.io/market/sale/${saleId}`
            const listingsLink = `https://wax.atomichub.io/market?collection_name=${collectionName}&data:text.name=${cardName}&order=asc&schema_name=${schemaName}&sort=price&symbol=WAX`

            const output = `
            <tr>
                <td style="color: ${collectionName.toHSL()}">${collectionName}</td>
                <td style="color: darkcyan">${cardName}</td>
                <td>
                    <span style="color: orange">${Math.round(price * 100) / 100}</span> WAX
                </td>
                <td>
                    <span  style="color: green">$${(price * waxPrice).toFixed(2)}</span>
                </td>
                <td>
                <a href="${saleLink}" target="_blank">buy</a> | <a href="${salesLink}" target="_blank">sales</a>  | <a href="${listingsLink}" target="_blank">listings</a>
                </td>
            </tr>`

            exchangeTable.insertAdjacentHTML('afterbegin', output)
        }
    }

    const now = new Date();
    document.getElementById('timestamp').innerText = now.toLocaleTimeString();

    setTimeout(populatePage, refreshInterval)
}

const refreshInterval = 5 * 60 * 1000;

(async () => {
    await populatePage();
})();

refreshTableButton.addEventListener('click', populatePage);

// Using to give collection names different colors based on their name
String.prototype.toHSL = function(opts) {
    var h, s, l;
    opts = opts || {};
    opts.hue = opts.hue || [0, 360];
    opts.sat = opts.sat || [75, 100];
    opts.lit = opts.lit || [40, 60];

    var range = function(hash, min, max) {
        var diff = max - min;
        var x = ((hash % diff) + diff) % diff;
        return x + min;
    }

    var hash = 0;
    if (this.length === 0) return hash;
    for (var i = 0; i < this.length; i++) {
        hash = this.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash;
    }

    h = range(hash, opts.hue[0], opts.hue[1]);
    s = range(hash, opts.sat[0], opts.sat[1]);
    l = range(hash, opts.lit[0], opts.lit[1]);

    return `hsl(${h}, ${s}%, ${l}%)`;
}
