const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const SRC = path.resolve(process.cwd(), 'frontend/src');
const OUT = path.resolve(process.cwd(), 'frontend/src/locales');
const EN_FILE = path.join(OUT, 'en.json');

function readFiles(dir, files = []) {
    const entries = fs.readdirSync(dir);
    for (const e of entries) {
        const full = path.join(dir, e);
        if (fs.statSync(full).isDirectory()) {
            if (['node_modules', 'dist', 'build', '.git'].includes(e)) continue;
            readFiles(full, files);
        } else if (/\.(js|jsx|ts|tsx)$/.test(e)) {
            files.push(full);
        }
    }
    return files;
}

function parseFile(filePath) {
    const src = fs.readFileSync(filePath, 'utf8');
    try {
        const ast = parser.parse(src, {
            sourceType: "module",
            plugins: ["jsx", "typescript", "classProperties", "optionalChaining"]
        });
        const strings = [];
        traverse(ast, {
            JSXText({ node }) {
                const v = node.value && node.value.trim();
                if (v) strings.push(v);
            },
            JSXAttribute({ node }) {
                if (node.value && node.value.type === 'StringLiteral') {
                    const v = node.value.value && node.value.value.trim();
                    if (v) strings.push(v);
                }
            }
        });
        return strings;
    } catch (err) {
        console.warn('Failed parse', filePath, err.message);
        return [];
    }
}

function slugifyKey(raw, prefix) {
    const k = raw.toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 60);
    return `${prefix || 'misc'}.${k || 'text'}`;
}

function main() {
    if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
    const files = readFiles(SRC);
    console.log(`Scanning ${files.length} files...`);
    const keys = {};
    files.forEach(f => {
        const strings = parseFile(f);
        strings.forEach(s => {
            if (!s || s.length < 2) return;
            const prefix = path.relative(SRC, f).replace(/[\/\\]/g, '.').replace(/\.(js|jsx|ts|tsx)$/, '');
            const key = slugifyKey(s, prefix);
            let k = key;
            let i = 1;
            while (keys[k] && keys[k] !== s) { k = `${key}_${i++}`; }
            keys[k] = s;
        });
    });

    let existing = {};
    if (fs.existsSync(EN_FILE)) {
        existing = JSON.parse(fs.readFileSync(EN_FILE, 'utf8'));
    }
    const merged = { ...keys, ...existing };
    Object.keys(keys).forEach(k => { if (existing[k]) merged[k] = existing[k]; });

    fs.writeFileSync(EN_FILE, JSON.stringify(merged, null, 2));
    console.log(`Wrote ${Object.keys(merged).length} keys to ${EN_FILE}`);
}

main();
