const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// Import translation helper - adjust path as needed
const { translateBatchWithSmartModel } = require('./scripts/translate-gemini.cjs');

const app = express();
const LOCALES_DIR = path.join(__dirname, 'public', 'locales');
const SRC_FILE = path.join(__dirname, 'src', 'translations', 'en.js');

app.use(cors());
app.use(express.json());

if (!fs.existsSync(LOCALES_DIR)) fs.mkdirSync(LOCALES_DIR, { recursive: true });

// Load English source
async function loadEnglishTranslations() {
    try {
        const fileUrl = 'file://' + SRC_FILE.replace(/\\/g, '/');
        const module = await import(fileUrl);
        return module.default;
    } catch (err) {
        console.error('Error loading English translations:', err);
        return {};
    }
}

// Helper to flatten nested object
function flattenKeys(obj, prefix = '') {
    let keys = [];
    for (const k in obj) {
        if (typeof obj[k] === 'object' && obj[k] !== null) {
            keys = keys.concat(flattenKeys(obj[k], prefix + k + '.'));
        } else {
            keys.push(prefix + k);
        }
    }
    return keys;
}

// Helper to get value from nested object
function getValue(obj, path) {
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
}

// Helper to set value in nested object
function setValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((o, k) => {
        o[k] = o[k] || {};
        return o[k];
    }, obj);
    target[lastKey] = value;
}

// On-demand translation endpoint
app.get('/locales/:lang.json', async (req, res) => {
    const lang = req.params.lang;
    const outfile = path.join(LOCALES_DIR, `${lang}.json`);

    // Return existing file if available
    if (fs.existsSync(outfile)) {
        return res.sendFile(outfile);
    }

    // Generate on-demand
    try {
        console.log(`Generating on-demand translation for ${lang}...`);

        const srcJson = await loadEnglishTranslations();
        const keys = flattenKeys(srcJson);

        // Prepare batch items
        const batchObj = {};
        keys.forEach(k => {
            batchObj[k] = getValue(srcJson, k);
        });

        // Translate (using existing function)
        const translated = await translateBatchWithSmartModel(
            Object.keys(batchObj).map(k => ({ key: k, text: batchObj[k] })),
            lang
        );

        // Convert back to nested structure
        const resultObj = {};
        translated.forEach(item => {
            setValue(resultObj, item.key, item.text);
        });

        // Cache the result
        fs.writeFileSync(outfile, JSON.stringify(resultObj, null, 2), 'utf8');

        console.log(`Generated and cached ${outfile}`);
        return res.json(resultObj);

    } catch (e) {
        console.error('On-demand translation failed', e);
        return res.status(500).json({
            error: 'translation_failed',
            message: e.message || String(e)
        });
    }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Translation server listening on port ${PORT}`);
    console.log(`Locales directory: ${LOCALES_DIR}`);
    console.log('Available endpoints:');
    console.log('  GET /locales/:lang.json - Get or generate translation');
    console.log('  GET /health - Health check');
});
