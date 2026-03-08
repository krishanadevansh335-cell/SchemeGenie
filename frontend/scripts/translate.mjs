import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from backend .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error('❌ Error: GOOGLE_API_KEY or GEMINI_API_KEY not found in backend/.env');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const LANGUAGES = {
    hi: "Hindi",
    bn: "Bengali",
    te: "Telugu",
    mr: "Marathi",
    ta: "Tamil",
    gu: "Gujarati",
    kn: "Kannada",
    ml: "Malayalam",
    or: "Odia",
    pa: "Punjabi",
    as: "Assamese",
    ks: "Kashmiri",
    ne: "Nepali",
    kok: "Konkani",
    sd: "Sindhi",
    mni: "Manipuri",
    doi: "Dogri",
    brx: "Bodo",
    mai: "Maithili",
    sa: "Sanskrit",
    sat: "Santali"
};

// Path to source English file
const SOURCE_FILE = path.resolve(__dirname, '../src/translations/en.js');
const TARGET_DIR = path.resolve(__dirname, '../src/translations');

// Helper to load the JS object from file (since it's not JSON)
async function loadEnglishTranslations() {
    try {
        // Dynamic import of the source file
        const module = await import(`file://${SOURCE_FILE}`);
        return module.default;
    } catch (error) {
        console.error('Error loading en.js:', error);
        process.exit(1);
    }
}

// Helper to translate a chunk of text/object
async function translateChunk(data, langName, sectionName) {
    const prompt = `
    You are a professional translator for a government scheme website.
    Translate the following JSON object values from English to ${langName}.
    
    Rules:
    1. Return ONLY valid JSON.
    2. Do NOT translate keys.
    3. Maintain the exact same structure.
    4. Translate culturally appropriately for ${langName}.
    5. For "Scheme Genie", keep it as "Scheme Genie" or transliterate if appropriate.
    
    Context: This is the "${sectionName}" section of the website.

    Input JSON:
    ${JSON.stringify(data, null, 2)}
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response.text();

        // Extract JSON from markdown code block if present
        const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/```\n([\s\S]*?)\n```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : response;

        return JSON.parse(jsonStr);
    } catch (error) {
        console.error(`Error translating ${sectionName} to ${langName}:`, error.message);
        return data; // Fallback to original
    }
}

async function main() {
    console.log('🚀 Starting Translation System...');
    console.log(`📂 Source: ${SOURCE_FILE}`);

    const enData = await loadEnglishTranslations();

    // Process each language
    for (const [code, name] of Object.entries(LANGUAGES)) {
        console.log(`\n----------------------------------------`);
        console.log(`🌐 Processing ${name} (${code})...`);

        const translatedData = {};
        const totalSections = Object.keys(enData).length;
        let currentSection = 0;

        // Translate section by section to avoid token limits and maintain context
        for (const [key, value] of Object.entries(enData)) {
            currentSection++;
            process.stdout.write(`   ⏳ Translating section '${key}' (${currentSection}/${totalSections})... `);

            if (typeof value === 'object') {
                translatedData[key] = await translateChunk(value, name, key);
            } else {
                // Handle top-level strings if any
                const result = await translateChunk({ val: value }, name, key);
                translatedData[key] = result.val;
            }
            console.log('✅');
        }

        // Write to file
        const fileContent = `export default ${JSON.stringify(translatedData, null, 2)};\n`;
        const filePath = path.join(TARGET_DIR, `${code}.js`);

        fs.writeFileSync(filePath, fileContent);
        console.log(`💾 Saved: ${code}.js`);
    }

    console.log('\n✨ All translations completed successfully!');
}

main();
