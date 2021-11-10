const exchangeTable = document.getElementById('exchangeTable');
const refreshTableButton = document.getElementById('refreshTableButton');

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

        for (const d of data.data) {
            console.log("DATA:", d)

            const precision = d.price.token_precision
            const left = d.price.amount.substring(0, d.price.amount.length - precision)
            const right = d.price.amount.substring(d.price.amount.length - precision)
            const price =  parseFloat(`${left}.${right}`)

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
