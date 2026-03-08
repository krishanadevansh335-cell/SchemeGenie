
const fs = require('fs');
const path = require('path');
const translate = require('@iamtraction/google-translate');

// Adjust paths for the current project structure
const TRANSLATIONS_DIR = path.resolve(process.cwd(), 'src/translations');
const EN_FILE = path.join(TRANSLATIONS_DIR, 'en.js');

// Map of language codes
const LANGUAGES = {
    hi: 'Hindi',
    kn: 'Kannada',
    ta: 'Tamil',
    te: 'Telugu',
    ml: 'Malayalam',
    mr: 'Marathi',
    gu: 'Gujarati',
    bn: 'Bengali',
    pa: 'Punjabi',
    or: 'Odia',
    as: 'Assamese',
    ne: 'Nepali',
    sd: 'Sindhi',
    sa: 'Sanskrit',
    ur: 'Urdu',
    brx: 'Bodo',
    doi: 'Dogri',
    ks: 'Kashmiri',
    kok: 'Konkani',
    mai: 'Maithili',
    mni: 'Manipuri',
    sat: 'Santali'
};

// Helper to load module
async function loadModule(filePath) {
    try {
        const fileUrl = 'file://' + filePath.replace(/\\/g, '/');
        const module = await import(fileUrl);
        return module.default;
    } catch (err) {
        console.error(`Error loading module ${filePath}:`, err);
        return {};
    }
}

// Helper to flatten object keys
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

// Helper to get value
function getValue(obj, path) {
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
}

// Helper to set value
function setValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((o, k) => {
        o[k] = o[k] || {};
        return o[k];
    }, obj);
    target[lastKey] = value;
}

async function main() {
    if (!fs.existsSync(EN_FILE)) {
        console.error(`Source file not found: ${EN_FILE}`);
        process.exit(1);
    }

    console.log('Loading English translations...');
    const enData = await loadModule(EN_FILE);
    const enKeys = flattenKeys(enData);

    const targetLangs = process.argv.slice(2).length > 0
        ? process.argv.slice(2)
        : Object.keys(LANGUAGES);

    for (const langCode of targetLangs) {
        const langName = LANGUAGES[langCode];
        const langFile = path.join(TRANSLATIONS_DIR, `${langCode}.js`);

        console.log(`\nProcessing ${langName} (${langCode})...`);

        let existingData = {};
        if (fs.existsSync(langFile)) {
            existingData = await loadModule(langFile);
        }

        const missingKeys = enKeys.filter(k => {
            const val = getValue(existingData, k);
            return !val || val === '';
        });

        if (missingKeys.length === 0) {
            console.log(`  - Up to date.`);
            continue;
        }

        console.log(`  - Found ${missingKeys.length} missing keys.`);

        const newData = JSON.parse(JSON.stringify(existingData));
        let updated = false;

        // Process in smaller batches for free API
        const BATCH_SIZE = 10;

        for (let i = 0; i < missingKeys.length; i += BATCH_SIZE) {
            const batchKeys = missingKeys.slice(i, i + BATCH_SIZE);

            // Create array of texts to translate
            const textsToTranslate = batchKeys.map(k => getValue(enData, k));

            try {
                // Translate one by one to be safe with free API, or use batch if supported reliably
                // iamtraction supports batch but sometimes it's flaky. Let's try batch first.
                // Actually, iamtraction takes a single string or array.

                // For better reliability with free API, let's do one by one for now, 
                // or small concurrent batches.

                console.log(`  - Translating batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(missingKeys.length / BATCH_SIZE)}...`);

                // We'll map the language codes that Google Translate supports
                // Some codes might need adjustment (e.g. 'kok' might not be supported directly or needs 'gom')
                let googleLangCode = langCode;
                if (langCode === 'kok') googleLangCode = 'gom'; // Konkani
                if (langCode === 'mni') googleLangCode = 'mni-Mtei'; // Manipuri

                // Parallelize the batch
                const promises = textsToTranslate.map(text =>
                    translate(text, { to: googleLangCode })
                        .then(res => res.text)
                        .catch(err => {
                            // console.warn(`    Failed to translate: "${text.substring(0, 20)}..."`);
                            return text; // Fallback to English
                        })
                );

                const results = await Promise.all(promises);

                batchKeys.forEach((key, index) => {
                    setValue(newData, key, results[index]);
                });

                updated = true;

                // Save periodically
                const fileContent = `export default ${JSON.stringify(newData, null, 2)};\n`;
                fs.writeFileSync(langFile, fileContent);

                // Small delay to be nice to the API
                await new Promise(r => setTimeout(r, 500));

            } catch (err) {
                console.error('  Batch error:', err.message);
            }
        }

        if (updated) {
            console.log(`  - Saved updates to ${langFile}`);
        }
    }

    console.log('\nTranslation complete!');
}

main().catch(console.error);
