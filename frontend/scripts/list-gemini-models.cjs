
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs');

// Try to read .env from root
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

if (!process.env.GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY environment variable is not set.');
    process.exit(1);
}

// We need to use fetch directly because the SDK might mask the list models endpoint or I want to be raw
async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error('API Error:', data.error);
        } else {
            console.log('Available Models:');
            if (data.models) {
                data.models.forEach(m => {
                    console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`);
                });
            } else {
                console.log('No models found in response.');
            }
        }
    } catch (error) {
        console.error('Request failed:', error);
    }
}

listModels();
