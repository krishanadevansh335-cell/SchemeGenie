const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const translate = require('@iamtraction/google-translate');

// ---- CONFIG ----
const LANGS = ["hi", "bn", "ta", "te", "mr", "gu", "kn", "ml", "or", "pa", "ur", "ne", "si", "as", "ma", "en-GB", "fr", "es", "de", "ru", "zh", "ar"];
const SRC_FILE = path.join(__dirname, '..', 'src', 'translations', 'en.js'); // your source i18n file
const OUT_DIR = path.join(__dirname, '..', 'public', 'locales');   // public dir served by frontend
const BATCH_SIZE = 50; // optional: chunk keys to avoid long prompts

// Make sure output directory exists
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Load the English translations from JS file
async function loadEnglishTranslations() {
    try {
        const fileUrl = 'file://' + SRC_FILE.replace(/\\/g, '/');
        const module = await import(fileUrl);
        return module.default;
    } catch (err) {
        console.error('Error loading English translations:', err);
        process.exit(1);
    }
}

// Flatten nested object keys
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

// Get value from nested object by path
function getValue(obj, path) {
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
}

// Set value in nested object by path
function setValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((o, k) => {
        o[k] = o[k] || {};
        return o[k];
    }, obj);
    target[lastKey] = value;
}

// Model selection logic
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

// Translation with Gemini
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

// Fallback translation using Google Translate
async function translateBatchFallback(texts, targetLang) {
    const keys = Object.keys(texts);
    const values = Object.values(texts);

    let googleLangCode = targetLang;
    if (targetLang === 'kok') googleLangCode = 'gom';
    if (targetLang === 'mni') googleLangCode = 'mni-Mtei';

    const promises = values.map(text =>
        translate(String(text), { to: googleLangCode })
            .then(res => res.text)
            .catch(() => String(text)) // Return original on failure
    );

    const results = await Promise.all(promises);

    const translated = {};
    keys.forEach((key, index) => {
        translated[key] = results[index];
    });
    return translated;
}

// Validation function
function validateTranslation(source, target, lang) {
    const errors = [];

    // Check key parity
    const sourceKeys = Object.keys(source);
    const targetKeys = Object.keys(target);

    const missingKeys = sourceKeys.filter(k => !targetKeys.includes(k));
    const extraKeys = targetKeys.filter(k => !sourceKeys.includes(k));

    if (missingKeys.length > 0) {
        errors.push(`Missing keys in ${lang}: ${missingKeys.join(', ')}`);
    }

    if (extraKeys.length > 0) {
        errors.push(`Extra keys in ${lang}: ${extraKeys.join(', ')}`);
    }

    // Check placeholders
    sourceKeys.forEach(key => {
        const sourceText = source[key];
        const targetText = target[key];

        if (!targetText) {
            errors.push(`Empty translation for key: ${key}`);
            return;
        }

        // Check for placeholders like {{name}}, {count}, %s
        const sourcePlaceholders = sourceText.match(/\{\{[^}]+\}\}|\{[^}]+\}|%[sd]/g) || [];
        const targetPlaceholders = targetText.match(/\{\{[^}]+\}\}|\{[^}]+\}|%[sd]/g) || [];

        if (sourcePlaceholders.length !== targetPlaceholders.length) {
            errors.push(`Placeholder mismatch for key ${key}: source="${sourceText}" target="${targetText}"`);
        }

        // Check HTML tags (basic check)
        const sourceTags = sourceText.match(/<[^>]+>/g) || [];
        const targetTags = targetText.match(/<[^>]+>/g) || [];

        if (sourceTags.length !== targetTags.length) {
            errors.push(`HTML tag mismatch for key ${key}: source="${sourceText}" target="${targetText}"`);
        }
    });

    return errors;
}

// Chunk array helper
async function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
}

// Main generation function
async function generateForLang(lang, srcJson, geminiModel) {
    console.log('Generating translations for', lang);
    const resultObj = {};
    const keys = flattenKeys(srcJson);
    const chunks = await chunkArray(keys, BATCH_SIZE);

    for (let i = 0; i < chunks.length; i++) {
        // Prepare batch items
        const batchObj = {};
        chunks[i].forEach(k => {
            batchObj[k] = getValue(srcJson, k);
        });

        // Call the translator helper (which will use Gemini or fallback to Google)
        let batchTranslated = {};

        if (geminiModel) {
            try {
                batchTranslated = await translateBatchGemini(geminiModel, batchObj, lang);
            } catch (err) {
                console.warn(`    Gemini failed (${err.message.split('\n')[0]}). Switching to fallback for this batch.`);
                batchTranslated = await translateBatchFallback(batchObj, lang);
            }
        } else {
            batchTranslated = await translateBatchFallback(batchObj, lang);
        }

        // Apply translations
        for (const key in batchTranslated) {
            setValue(resultObj, key, batchTranslated[key]);
        }

        console.log(`  chunk ${i + 1}/${chunks.length} done`);
        // Throttle a bit
        await new Promise(r => setTimeout(r, 200));
    }

    // Validate the translation
    const errors = validateTranslation(srcJson, resultObj, lang);
    if (errors.length > 0) {
        console.warn(`Validation errors for ${lang}:`);
        errors.forEach(err => console.warn(`  - ${err}`));
    }

    // Save to file
    const outfile = path.join(OUT_DIR, `${lang}.json`);
    fs.writeFileSync(outfile, JSON.stringify(resultObj, null, 2), 'utf8');
    console.log('Saved', outfile);

    return resultObj;
}

// Main execution
(async () => {
    // Load environment variables
    const rootEnvPath = path.resolve(__dirname, '..', '..', '.env');
    if (fs.existsSync(rootEnvPath)) {
        const envConfig = fs.readFileSync(rootEnvPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["'](.*)["']$/, '$1');
                if (key === 'GEMINI_API_KEY' || key === 'GOOGLE_API_KEY') {
                    process.env[key] = value;
                }
            }
        });
    }

    if (!fs.existsSync(SRC_FILE)) {
        console.error('Source i18n file not found:', SRC_FILE);
        process.exit(1);
    }

    console.log('Loading English translations...');
    const srcJson = await loadEnglishTranslations();

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

    for (const lang of LANGS) {
        try {
            await generateForLang(lang, srcJson, geminiModel);
        } catch (e) {
            console.error('Failed generating for', lang, e.message || e);
        }
    }

    console.log('All languages processed.');
})();
