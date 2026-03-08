const fs = require('fs');
const path = require('path');
const OUT = path.resolve(process.cwd(), 'frontend/src/locales');
const enFile = path.join(OUT, 'en.json');

function readJson(p) { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {}; }

const en = readJson(enFile);
const files = fs.readdirSync(OUT).filter(f => f.endsWith('.json') && f !== 'en.json');

const missingReport = {};
files.forEach(f => {
    const full = path.join(OUT, f);
    const data = readJson(full);
    let changed = false;
    Object.keys(en).forEach(k => {
        if (data[k] === undefined) {
            data[k] = "";
            changed = true;
            missingReport[f] = missingReport[f] || [];
            missingReport[f].push(k);
        }
    });
    if (changed) fs.writeFileSync(full, JSON.stringify(data, null, 2));
});

console.log('Sync done. Missing keys per language:');
Object.entries(missingReport).forEach(([f, keys]) => {
    console.log(`${f}: ${keys.length} missing`);
});
