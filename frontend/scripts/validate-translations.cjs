// Translation validation module
// Ensures translation quality by checking placeholders, HTML, key parity, and more

const fs = require('fs');
const path = require('path');

// Validation rules and functions
class TranslationValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
    }

    // Validate translation quality
    validateTranslation(source, target, lang) {
        this.errors = [];
        this.warnings = [];

        // Check key parity
        this.checkKeyParity(source, target, lang);

        // Check placeholders
        this.checkPlaceholders(source, target, lang);

        // Check HTML tags
        this.checkHtmlTags(source, target, lang);

        // Check text length (warn if significantly different)
        this.checkTextLength(source, target, lang);

        // Check for empty translations
        this.checkEmptyTranslations(target, lang);

        // Check for untranslated content (same as source)
        this.checkUntranslatedContent(source, target, lang);

        return {
            isValid: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings
        };
    }

    // Check if all keys are present
    checkKeyParity(source, target, lang) {
        const sourceKeys = this.getAllKeys(source);
        const targetKeys = this.getAllKeys(target);

        const missingKeys = sourceKeys.filter(k => !targetKeys.includes(k));
        const extraKeys = targetKeys.filter(k => !sourceKeys.includes(k));

        if (missingKeys.length > 0) {
            this.errors.push(`Missing keys in ${lang}: ${missingKeys.join(', ')}`);
        }

        if (extraKeys.length > 0) {
            this.warnings.push(`Extra keys in ${lang}: ${extraKeys.join(', ')}`);
        }
    }

    // Get all keys from nested object
    getAllKeys(obj, prefix = '') {
        let keys = [];
        for (const k in obj) {
            if (typeof obj[k] === 'object' && obj[k] !== null) {
                keys = keys.concat(this.getAllKeys(obj[k], prefix + k + '.'));
            } else {
                keys.push(prefix + k);
            }
        }
        return keys;
    }

    // Get value from nested object
    getValue(obj, path) {
        return path.split('.').reduce((o, k) => (o || {})[k], obj);
    }

    // Check placeholders are preserved
    checkPlaceholders(source, target, lang) {
        const sourceKeys = this.getAllKeys(source);

        sourceKeys.forEach(key => {
            const sourceText = this.getValue(source, key);
            const targetText = this.getValue(target, key);

            if (!targetText) return;

            // Check for various placeholder patterns
            const sourcePlaceholders = [
                ...(sourceText.match(/\{\{[^}]+\}\}/g) || []),
                ...(sourceText.match(/\{[^}]+\}/g) || []),
                ...(sourceText.match(/%[sd]/g) || []),
                ...(sourceText.match(/\$\{[^}]+\}/g) || [])
            ];

            const targetPlaceholders = [
                ...(targetText.match(/\{\{[^}]+\}\}/g) || []),
                ...(targetText.match(/\{[^}]+\}/g) || []),
                ...(targetText.match(/%[sd]/g) || []),
                ...(targetText.match(/\$\{[^}]+\}/g) || [])
            ];

            if (sourcePlaceholders.length !== targetPlaceholders.length) {
                this.errors.push(`Placeholder mismatch for key ${key} in ${lang}: source="${sourceText}" target="${targetText}"`);
            }
        });
    }

    // Check HTML tags are preserved
    checkHtmlTags(source, target, lang) {
        const sourceKeys = this.getAllKeys(source);

        sourceKeys.forEach(key => {
            const sourceText = this.getValue(source, key);
            const targetText = this.getValue(target, key);

            if (!targetText) return;

            // Extract HTML tags
            const sourceTags = sourceText.match(/<[^>]+>/g) || [];
            const targetTags = targetText.match(/<[^>]+>/g) || [];

            if (sourceTags.length !== targetTags.length) {
                this.errors.push(`HTML tag count mismatch for key ${key} in ${lang}: source="${sourceText}" target="${targetText}"`);
            }

            // Check for broken HTML (basic check)
            if (targetText.includes('<') && !targetText.includes('>')) {
                this.errors.push(`Broken HTML in key ${key} in ${lang}: "${targetText}"`);
            }
        });
    }

    // Check text length ratio
    checkTextLength(source, target, lang) {
        const sourceKeys = this.getAllKeys(source);

        sourceKeys.forEach(key => {
            const sourceText = this.getValue(source, key);
            const targetText = this.getValue(target, key);

            if (!targetText) return;

            const sourceLength = sourceText.length;
            const targetLength = targetText.length;

            // Warn if translation is significantly longer or shorter
            if (sourceLength > 0) {
                const ratio = targetLength / sourceLength;
                if (ratio > 3) {
                    this.warnings.push(`Translation much longer for key ${key} in ${lang}: ${sourceLength} -> ${targetLength} chars`);
                } else if (ratio < 0.3 && sourceLength > 10) {
                    this.warnings.push(`Translation much shorter for key ${key} in ${lang}: ${sourceLength} -> ${targetLength} chars`);
                }
            }
        });
    }

    // Check for empty translations
    checkEmptyTranslations(target, lang) {
        const targetKeys = this.getAllKeys(target);

        targetKeys.forEach(key => {
            const targetText = this.getValue(target, key);

            if (!targetText || targetText.trim() === '') {
                this.errors.push(`Empty translation for key ${key} in ${lang}`);
            }
        });
    }

    // Check for untranslated content (same as source)
    checkUntranslatedContent(source, target, lang) {
        const sourceKeys = this.getAllKeys(source);

        sourceKeys.forEach(key => {
            const sourceText = this.getValue(source, key);
            const targetText = this.getValue(target, key);

            if (targetText && sourceText === targetText && sourceText.length > 5) {
                // Only warn for longer strings (short ones might be the same legitimately)
                this.warnings.push(`Translation identical to source for key ${key} in ${lang}: "${sourceText}"`);
            }
        });
    }

    // Auto-fix simple issues if possible
    autoFix(source, target, lang) {
        const fixed = JSON.parse(JSON.stringify(target));
        const sourceKeys = this.getAllKeys(source);

        sourceKeys.forEach(key => {
            const sourceValue = this.getValue(source, key);
            const targetValue = this.getValue(fixed, key);

            // Fix missing keys by copying from source
            if (!targetValue) {
                this.setValue(fixed, key, sourceValue);
                this.warnings.push(`Auto-fixed missing key ${key} in ${lang} by copying from source`);
            }
        });

        return fixed;
    }

    // Set value in nested object
    setValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((o, k) => {
            o[k] = o[k] || {};
            return o[k];
        }, obj);
        target[lastKey] = value;
    }

    // Generate validation report
    generateReport(lang, validationResult) {
        const report = {
            language: lang,
            timestamp: new Date().toISOString(),
            isValid: validationResult.isValid,
            errorCount: validationResult.errors.length,
            warningCount: validationResult.warnings.length,
            errors: validationResult.errors,
            warnings: validationResult.warnings
        };

        return report;
    }

    // Save validation report to file
    saveReport(report, outputDir) {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const reportFile = path.join(outputDir, `validation-${report.language}.json`);
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        console.log(`Validation report saved: ${reportFile}`);
    }
}

// Standalone validation function
function validateTranslationFile(sourceFile, targetFile, lang, outputDir = null) {
    const validator = new TranslationValidator();

    try {
        const source = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
        const target = JSON.parse(fs.readFileSync(targetFile, 'utf8'));

        const result = validator.validateTranslation(source, target, lang);

        console.log(`\nValidation for ${lang}:`);
        console.log(`  Valid: ${result.isValid}`);
        console.log(`  Errors: ${result.errors.length}`);
        console.log(`  Warnings: ${result.warnings.length}`);

        if (result.errors.length > 0) {
            console.log('\nErrors:');
            result.errors.forEach(err => console.log(`  - ${err}`));
        }

        if (result.warnings.length > 0) {
            console.log('\nWarnings:');
            result.warnings.forEach(warn => console.log(`  - ${warn}`));
        }

        // Save report if output directory specified
        if (outputDir) {
            const report = validator.generateReport(lang, result);
            validator.saveReport(report, outputDir);
        }

        return result;
    } catch (error) {
        console.error(`Error validating ${lang}:`, error.message);
        return { isValid: false, errors: [error.message], warnings: [] };
    }
}

// Batch validation for multiple languages
function validateAllLanguages(sourceFile, targetDir, languages, outputDir = null) {
    const results = {};

    console.log(`Starting batch validation for ${languages.length} languages...`);

    languages.forEach(lang => {
        const targetFile = path.join(targetDir, `${lang}.json`);
        if (fs.existsSync(targetFile)) {
            results[lang] = validateTranslationFile(sourceFile, targetFile, lang, outputDir);
        } else {
            console.warn(`Translation file not found: ${targetFile}`);
            results[lang] = { isValid: false, errors: ['File not found'], warnings: [] };
        }
    });

    // Summary
    const validCount = Object.values(results).filter(r => r.isValid).length;
    console.log(`\nValidation Summary:`);
    console.log(`  Valid languages: ${validCount}/${languages.length}`);
    console.log(`  Invalid languages: ${languages.length - validCount}/${languages.length}`);

    return results;
}

module.exports = {
    TranslationValidator,
    validateTranslationFile,
    validateAllLanguages
};
