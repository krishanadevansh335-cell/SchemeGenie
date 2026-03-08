const fs = require('fs');
const path = require('path');

// Convert JS translation files to JSON format
function convertJsToJson() {
    const translationsDir = path.resolve(__dirname, '..', 'src', 'translations');
    const outputDir = path.resolve(__dirname, '..', 'public', 'locales');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Get all JS files in translations directory
    const jsFiles = fs.readdirSync(translationsDir).filter(file => file.endsWith('.js'));

    console.log(`Converting ${jsFiles.length} translation files...`);

    jsFiles.forEach(file => {
        const filePath = path.join(translationsDir, file);
        const langCode = file.replace('.js', '');

        try {
            // Read and parse the JS file
            const content = fs.readFileSync(filePath, 'utf8');

            // Extract the JSON from the export default statement
            const jsonMatch = content.match(/export default\s+({[\s\S]*});?\s*$/);
            if (jsonMatch) {
                const jsonString = jsonMatch[1];
                const parsed = eval(`(${jsonString})`); // Safe since we control the files

                // Write as JSON
                const outputPath = path.join(outputDir, `${langCode}.json`);
                fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2));

                console.log(`✓ Converted ${file} -> ${langCode}.json`);
            } else {
                console.warn(`⚠ Could not parse ${file}`);
            }
        } catch (error) {
            console.error(`✗ Error converting ${file}:`, error.message);
        }
    });

    console.log('\nConversion complete!');
}

if (require.main === module) {
    convertJsToJson();
}

module.exports = { convertJsToJson };
