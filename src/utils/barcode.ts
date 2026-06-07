/**
 * Barcode Generator Utility — Pure SVG Code128 barcode generation
 * No external dependencies. Generates printable barcode labels.
 */

// Code128 encoding table (character set B covers ASCII 32-127)
const CODE128_B = {
    " ": "11011001100", "!": "11001101100", '"': "11001100110", "#": "10010011000",
    "$": "10010001100", "%": "10001001100", "&": "10011001000", "'": "10011000100",
    "(": "10001100100", ")": "11001001000", "*": "11001000100", "+": "11000100100",
    ",": "10110011100", "-": "10011011100", ".": "10011001110", "/": "10111001100",
    "0": "10011101100", "1": "10011100110", "2": "11001110010", "3": "11001011100",
    "4": "11001001110", "5": "11011100100", "6": "11001110100", "7": "11101101110",
    "8": "11101001100", "9": "11100101100", ":": "11100100110", ";": "11101100100",
    "<": "11100110100", "=": "11100110010", ">": "11011011000", "?": "11011000110",
    "@": "11000110110", "A": "10100011000", "B": "10001011000", "C": "10001000110",
    "D": "10110001000", "E": "10001101000", "F": "10001100010", "G": "11010001000",
    "H": "11000101000", "I": "11000100010", "J": "10110111000", "K": "10110001110",
    "L": "10001101110", "M": "10111011000", "N": "10111000110", "O": "10001110110",
    "P": "11101110110", "Q": "11010001110", "R": "11000101110", "S": "11011101000",
    "T": "11011100010", "U": "11011101110", "V": "11101011000", "W": "11101000110",
    "X": "11100010110", "Y": "11101101000", "Z": "11101100010", "[": "11100011010",
    "\\": "11101111010", "]": "11001000010", "^": "11110001010", "_": "10100110000",
    "`": "10100001100", "a": "10010110000", "b": "10010000110", "c": "10000101100",
    "d": "10000100110", "e": "10110010000", "f": "10110000100", "g": "10011010000",
    "h": "10011000010", "i": "10000110100", "j": "10000110010", "k": "11000010010",
    "l": "11001010000", "m": "11110111010", "n": "11000010100", "o": "10001111010",
    "p": "10100111100", "q": "10010111100", "r": "10010011110", "s": "10111100100",
    "t": "10011110100", "u": "10011110010", "v": "11110100100", "w": "11110010100",
    "x": "11110010010", "y": "11011011110", "z": "11011110110", "{": "11110110110",
    "|": "10101111000", "}": "10100011110", "~": "10001011110",
};

const START_B = "11010010000";
const STOP = "1100011101011";

// Character value lookup for checksum
const CHAR_VALUES = {};
" !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~".split("").forEach((c, i) => {
    CHAR_VALUES[c] = i;
});

const CHECKSUM_PATTERNS = [
    "11011001100", "11001101100", "11001100110", "10010011000", "10010001100",
    "10001001100", "10011001000", "10011000100", "10001100100", "11001001000",
    "11001000100", "11000100100", "10110011100", "10011011100", "10011001110",
    "10111001100", "10011101100", "10011100110", "11001110010", "11001011100",
    "11001001110", "11011100100", "11001110100", "11101101110", "11101001100",
    "11100101100", "11100100110", "11101100100", "11100110100", "11100110010",
    "11011011000", "11011000110", "11000110110", "10100011000", "10001011000",
    "10001000110", "10110001000", "10001101000", "10001100010", "11010001000",
    "11000101000", "11000100010", "10110111000", "10110001110", "10001101110",
    "10111011000", "10111000110", "10001110110", "11101110110", "11010001110",
    "11000101110", "11011101000", "11011100010", "11011101110", "11101011000",
    "11101000110", "11100010110", "11101101000", "11101100010", "11100011010",
    "11101111010", "11001000010", "11110001010", "10100110000", "10100001100",
    "10010110000", "10010000110", "10000101100", "10000100110", "10110010000",
    "10110000100", "10011010000", "10011000010", "10000110100", "10000110010",
    "11000010010", "11001010000", "11110111010", "11000010100", "10001111010",
    "10100111100", "10010111100", "10010011110", "10111100100", "10011110100",
    "10011110010", "11110100100", "11110010100", "11110010010", "11011011110",
    "11011110110", "11110110110", "10101111000", "10100011110", "10001011110",
];

/**
 * Generate Code128B barcode bit pattern
 */
function encodeCode128B(text) {
    let bits = START_B;
    let checksum = 104; // Start B value

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const pattern = CODE128_B[char];
        if (!pattern) continue; // skip unsupported chars
        bits += pattern;
        checksum += (CHAR_VALUES[char] ?? 0) * (i + 1);
    }

    // Add checksum
    const checksumIdx = checksum % 103;
    bits += CHECKSUM_PATTERNS[checksumIdx] || "";
    bits += STOP;

    return bits;
}

/**
 * Generate SVG barcode string
 * @param {string} text - Text to encode
 * @param {object} options - { width, height, showText, fontSize }
 * @returns {string} SVG markup string
 */
export function generateBarcodeSVG(text, options = {}) {
    const { width = 200, height = 60, showText = true, fontSize = 12, color = "#000" } = options;
    const bits = encodeCode128B(text);
    const barWidth = width / bits.length;
    const barHeight = showText ? height - fontSize - 6 : height;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background:white">`;

    for (let i = 0; i < bits.length; i++) {
        if (bits[i] === "1") {
            svg += `<rect x="${i * barWidth}" y="0" width="${barWidth}" height="${barHeight}" fill="${color}" />`;
        }
    }

    if (showText) {
        svg += `<text x="${width / 2}" y="${height - 2}" font-family="monospace" font-size="${fontSize}" text-anchor="middle" fill="${color}">${text}</text>`;
    }

    svg += "</svg>";
    return svg;
}

/**
 * Generate a printable label sheet with barcode + product info
 * Opens print dialog with formatted labels
 */
export function printBarcodeLabels(products, options = {}) {
    const { columns = 3, labelWidth = 200, labelHeight = 120 } = options;

    let html = `
    <!DOCTYPE html>
    <html><head><title>Barcode Labels</title>
    <style>
        @media print { @page { margin: 10mm; } body { margin: 0; } }
        body { font-family: 'Segoe UI', sans-serif; background: #fff; }
        .grid { display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: 8px; }
        .label { border: 1px dashed #ccc; padding: 8px; text-align: center; page-break-inside: avoid; }
        .label-name { font-size: 11px; font-weight: 700; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: ${labelWidth}px; }
        .label-price { font-size: 14px; font-weight: 900; margin-top: 4px; }
        .label-sku { font-size: 9px; color: #666; margin-top: 2px; }
    </style>
    </head><body><div class="grid">`;

    products.forEach(p => {
        const barcode = generateBarcodeSVG(p.sku || p.id, { width: labelWidth - 20, height: 50, fontSize: 10 });
        html += `
        <div class="label">
            <div class="label-name">${p.name}</div>
            ${barcode}
            <div class="label-price">\u20b9${p.sellPrice} <span style="font-size:10px;color:#888;text-decoration:line-through">MRP \u20b9${p.mrp || Math.round(p.sellPrice * 1.25)}</span></div>
            <div class="label-sku">${p.sku} · ${p.category || ""}</div>
        </div>`;
    });

    html += "</div></body></html>";

    const w = window.open("", "_blank", "width=800,height=600");
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
}

/**
 * Generate barcode as data URL (for embedding in UI)
 */
export function barcodeDataUrl(text, options = {}) {
    const svg = generateBarcodeSVG(text, options);
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}
