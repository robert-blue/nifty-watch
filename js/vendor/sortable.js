/**
 * sortable 1.0
 *
 * Makes html tables sortable, ie9+
 *
 * Styling is done in css.
 *
 * Copyleft 2017 Jonas Earendel
 *
 * This is free and unencumbered software released into the public domain.
 *
 * Anyone is free to copy, modify, publish, use, compile, sell, or
 * distribute this software, either in source code form or as a compiled
 * binary, for any purpose, commercial or non-commercial, and by any
 * means.
 *
 * In jurisdictions that recognize copyright laws, the author or authors
 * of this software dedicate any and all copyright interest in the
 * software to the public domain. We make this dedication for the benefit
 * of the public at large and to the detriment of our heirs and
 * successors. We intend this dedication to be an overt act of
 * relinquishment in perpetuity of all present and future rights to this
 * software under copyright law.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
 * OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 *
 * For more information, please refer to <http://unlicense.org>
 *
 */
// sort is super fast, even with huge tables, so that is probably not the issue
// Not solved with documentFragment, same issue... :(
// My guess is that it is simply too much to hold in memory, since
// it freezes even before sortable is called if the table is too big in index.html
const downClass = 'dir-d';
const upClass = 'dir-u';
function getValue(element) {
    // If you aren't using data-sort and want to make it just the tiniest bit smaller/faster
    // comment this line and uncomment the next one
    return element.getAttribute('data-sort') || element.innerText;
    // return element.innerText
}
function reClassify(element, dir) {
    element.classList.remove('dir-u', 'dir-d');
    if (dir) {
        element.classList.add(dir);
    }
}
export default function apply(element) {
    if (element.nodeName === 'TH') {
        try {
            const tr = element.parentNode;
            // var table = element.offsetParent; // Fails with positioned table elements
            // this is the only way to make really, really sure. A few more bytes though... 😡
            if (tr.parentNode === null) {
                throw new Error('TABLE not found');
            }
            const table = tr.parentNode.parentNode;
            if (table.classList.contains('sortable')) {
                let columnIndex = 0;
                const nodes = tr.cells;
                // reset thead cells and get column index
                for (let i = 0; i < nodes.length; i++) {
                    if (nodes[i] === element) {
                        columnIndex = i;
                    }
                    else {
                        reClassify(nodes[i], '');
                    }
                }
                // check if we're sorting up or down, and update the css accordingly
                const dir = (element.classList.contains(downClass)) ? upClass : downClass;
                reClassify(element, dir);
                sortTable(table, columnIndex, dir);
                // Attach the refresh function to the table so other code can trigger it
                table.sort = (colIndex = columnIndex, sortDir = dir) => sortTable(table, colIndex, sortDir);
                return table;
            }
        }
        catch (error) {
            // console.log(error)
        }
    }
    return undefined;
}
document.addEventListener('click', (e) => {
    const element = e.target;
    if (element.nodeName === 'TH') {
        apply(element);
    }
});
function sortTable(table, columnIndex, dir) {
    // extract all table rows, so the sorting can start.
    const tbodyOriginal = table.tBodies[0];
    // get the array rows in an array, so we can sort them...
    const rows = [].slice.call(tbodyOriginal.rows, 0);
    const reverse = dir === upClass;
    // sort them using custom built in array sort.
    rows.sort((a, b) => {
        const x = getValue((reverse ? a : b).cells[columnIndex]);
        const y = getValue((reverse ? b : a).cells[columnIndex]);
        // var y = (reverse ? b : a).cells[columnIndex].innerText
        // var x = (reverse ? a : b).cells[columnIndex].innerText
        const notNumber = Number.isNaN(x) || Number.isNaN(y);
        return notNumber ? x.localeCompare(y) : Number(x) - Number(y);
    });
    // Make a clone without content
    const tbodyClone = tbodyOriginal.cloneNode();
    // Build a sorted table body and replace the old one.
    while (rows.length) {
        tbodyClone.appendChild(rows.splice(0, 1)[0]);
    }
    // And finally insert the end result
    table.replaceChild(tbodyClone, tbodyOriginal);
}
//# sourceMappingURL=sortable.js.map