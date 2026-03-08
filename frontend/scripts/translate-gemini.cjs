
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const translate = require('@iamtraction/google-translate');

// --- Configuration ---
const TRANSLATIONS_DIR = path.resolve(process.cwd(), 'src/translations');
const EN_FILE = path.join(TRANSLATIONS_DIR, 'en.js');
const BATCH_SIZE = 30; // Reduced batch size for better reliability

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

// --- Helper Functions ---

async function loadModule(filePath) {
    try {
        const fileUrl = 'file://' + filePath.replace(/\\/g, '/');
        const module = await import(fileUrl);
        return module.default;
    } catch (err) {
        // console.error(`Error loading module ${filePath}:`, err);
        return {};
    }
}

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

function getValue(obj, path) {
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
}

function setValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((o, k) => {
        o[k] = o[k] || {};
        return o[k];
    }, obj);
    target[lastKey] = value;
}

// --- Model Selection Logic ---

async function pickModel(apiKey, preferredBases = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.warn(`ListModels failed: ${res.status} ${await res.text()}`);
            return null;
        }
        const body = await res.json();
        const names = (body.models || []).map(m => m.name);

        // Filter for generateContent supported models
        const supportedModels = (body.models || [])
            .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
            .map(m => m.name);

        for (const base of preferredBases) {
            const match = supportedModels.find(n => n.includes(base));
            if (match) return match.replace(/^models\//, '');
        }

        // Fallback to first available
        return supportedModels.length ? supportedModels[0].replace(/^models\//, '') : null;
    } catch (e) {
        console.warn("Failed to pick model dynamically:", e);
        return null;
    }
}

// --- Translation Logic ---

async function callGemini(model, prompt, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            if (i === retries - 1) throw error;
            // Exponential backoff
            await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
        }
    }
}

async function translateBatchGemini(model, texts, targetLang) {
    const prompt = `You are a strict, precise translation engine for software i18n. Output ONLY valid JSON, nothing else.
    
    Translate the following JSON object values to ${targetLang}.
    
    Rules:
    1. Output ONLY a single JSON object mapping each key to its translation.
    2. Do NOT translate keys.
    3. Preserve placeholders exactly (e.g., {{name}}, {count}, %s).
    4. Preserve HTML tags and attributes exactly (e.g., <a href="...">, <b>). Translate only visible text inside tags.
    5. Do not introduce new punctuation or newlines except where they are in the original string.
    6. If a term cannot be translated (brand names like SchemeSeva), keep it unchanged.
    7. Return valid UTF-8 strings.
    
    Input JSON:
    ${JSON.stringify(texts, null, 2)}`;

    const responseText = await callGemini(model, prompt);

    // Clean up response to ensure valid JSON
    const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
}

async function translateBatchFallback(texts, targetLang) {
    // console.log("    Using fallback translation...");
    const keys = Object.keys(texts);
    const values = Object.values(texts);

    let googleLangCode = targetLang;
    if (targetLang === 'kok') googleLangCode = 'gom';
    if (targetLang === 'mni') googleLangCode = 'mni-Mtei';

    const promises = values.map(text =>
        translate(text, { to: googleLangCode })
            .then(res => res.text)
            .catch(() => text) // Return original on failure
    );

    const results = await Promise.all(promises);

    const translated = {};
    keys.forEach((key, index) => {
        translated[key] = results[index];
    });
    return translated;
}

// --- Main Execution ---

async function main() {
    // Load env
    const rootEnvPath = path.resolve(process.cwd(), '../.env');
    if (fs.existsSync(rootEnvPath)) {
        const envConfig = fs.readFileSync(rootEnvPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["'](.*)["']$/, '$1');
                if (key === 'GEMINI_API_KEY' || key === 'GOOGLE_API_KEY') {
                    process.env.GEMINI_API_KEY = value;
                }
            }
        });
    }

    if (!fs.existsSync(EN_FILE)) {
        console.error(`Source file not found: ${EN_FILE}`);
        process.exit(1);
    }

    console.log('Loading English translations...');
    const enData = await loadModule(EN_FILE);
    const enKeys = flattenKeys(enData);

    // Setup Gemini
    let geminiModel = null;
    if (process.env.GEMINI_API_KEY) {
        const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const modelName = await pickModel(process.env.GEMINI_API_KEY);
        if (modelName) {
            console.log(`Using Gemini Model: ${modelName}`);
            geminiModel = client.getGenerativeModel({ model: modelName });
        } else {
            console.warn("Could not find a suitable Gemini model. Will use fallback.");
        }
    } else {
        console.warn("GEMINI_API_KEY not found. Will use fallback.");
    }

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
            const enVal = getValue(enData, k);
            // Treat as missing if empty OR identical to English (likely untranslated)
            // We exclude short strings or numbers to avoid false positives, but for UI text this is generally safe
            return !val || val === '' || (val === enVal && typeof val === 'string' && val.length > 2);
        });

        if (missingKeys.length === 0) {
            console.log(`  - Up to date.`);
            continue;
        }

        console.log(`  - Found ${missingKeys.length} missing keys.`);

        const newData = JSON.parse(JSON.stringify(existingData));
        let updated = false;

        for (let i = 0; i < missingKeys.length; i += BATCH_SIZE) {
            const batchKeys = missingKeys.slice(i, i + BATCH_SIZE);
            const batchObj = {};
            batchKeys.forEach(k => {
                batchObj[k] = getValue(enData, k);
            });

            console.log(`  - Translating batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(missingKeys.length / BATCH_SIZE)}...`);

            let translatedBatch = {};

            // Try Gemini first
            if (geminiModel) {
                try {
                    translatedBatch = await translateBatchGemini(geminiModel, batchObj, langName);
                } catch (err) {
                    console.warn(`    Gemini failed (${err.message.split('\n')[0]}). Switching to fallback for this batch.`);
                    translatedBatch = await translateBatchFallback(batchObj, langCode);
                }
            } else {
                translatedBatch = await translateBatchFallback(batchObj, langCode);
            }

            // Apply translations
            for (const key in translatedBatch) {
                // Ensure we map back correctly if Gemini returns flat or nested (we asked for flat-ish via JSON structure but let's be safe)
                // Actually we sent a flat object {key: value}, so we expect {key: value} back.
                if (translatedBatch[key]) {
                    setValue(newData, key, translatedBatch[key]);
                }
            }

            updated = true;

            // Save periodically
            const fileContent = `export default ${JSON.stringify(newData, null, 2)};\n`;
            fs.writeFileSync(langFile, fileContent);

            // Rate limiting
            await new Promise(r => setTimeout(r, 1000));
        }

        if (updated) {
            console.log(`  - Saved updates to ${langFile}`);
        }
    }

    console.log('\nTranslation complete!');
}

main().catch(console.error);
