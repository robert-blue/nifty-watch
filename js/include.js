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

function parseTokenValue(precision, amount) {
    const left = amount.substring(0, amount.length - precision)
    const right = amount.substring(amount.length - precision)
    return parseFloat(`${left}.${right}`)
}