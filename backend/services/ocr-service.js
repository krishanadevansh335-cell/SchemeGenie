#!/usr/bin/env node

/**
 * Enhanced OCR and Document Validation Service
 * Uses Google Cloud Vision as primary OCR engine with Tesseract as fallback
 * Handles OCR processing for Aadhaar, PAN, certificates and document validation
 */

import fs from 'fs';
import path from 'path';
import Tesseract from 'tesseract.js';
import { fileURLToPath } from 'url';
import { vision } from './config/google-cloud.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

class OCRService {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
    this.useGoogleVision = process.env.USE_GOOGLE_VISION !== 'false';
  }

  async initialize() {
    if (!this.isInitialized) {
      try {
        console.log('🤖 Initializing OCR service...');

        // Initialize Tesseract as fallback
        try {
          this.worker = await Tesseract.createWorker('eng');
        } catch (tesseractError) {
          console.error('❌ Failed to initialize Tesseract:', tesseractError);
          // If Tesseract fails, we can't do anything
          throw tesseractError;
        }

        // Test Google Vision connection if enabled
        if (this.useGoogleVision) {
          try {
            const visionClient = vision(); // Call the function to get the client
            if (!visionClient) {
              throw new Error('Google Vision client not available');
            }

            // Simple test to verify credentials
            // We wrap this in a try-catch that specifically looks for credential errors
            try {
              // Just checking if the client was created successfully is often enough
              // The actual API call might fail if credentials are missing, which is what we want to catch
              if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_PROJECT_ID) {
                console.warn('⚠️ Google Cloud credentials missing in environment variables');
                throw new Error('Missing Google Cloud credentials');
              }

              console.log('✅ Google Vision client initialized');
            } catch (apiError) {
              throw apiError;
            }
          } catch (error) {
            console.warn('⚠️ Google Vision API not available, falling back to Tesseract:', error.message);
            this.useGoogleVision = false;
          }
        }

        this.isInitialized = true;
        console.log(`✅ OCR service initialized successfully (Using ${this.useGoogleVision ? 'Google Vision' : 'Tesseract'})`);
      } catch (error) {
        console.error('❌ Failed to initialize OCR service:', error);
        // Even if initialization "fails", we might still have Tesseract
        if (this.worker) {
          console.log('⚠️ OCR service running in degraded mode with Tesseract only');
          this.isInitialized = true;
          this.useGoogleVision = false;
        } else {
          throw error;
        }
      }
    }
  }

  async processDocument(filePath, documentType = 'general') {
    await this.initialize();

    try {
      console.log(`🔍 Processing ${documentType} document: ${filePath}`);

      let text = '';
      let extractedData = {};
      let ocrEngine = this.useGoogleVision ? 'google-vision' : 'tesseract';

      // Try Google Vision first if enabled
      if (this.useGoogleVision) {
        try {
          const visionResult = await this.processWithGoogleVision(filePath);
          text = visionResult.text;
          extractedData = await this.extractDocumentData(text, documentType, filePath);
          console.log('✅ Successfully processed with Google Vision');
        } catch (visionError) {
          console.warn('⚠️ Google Vision failed, falling back to Tesseract:', visionError.message);
          this.useGoogleVision = false; // Disable Google Vision for subsequent attempts
          ocrEngine = 'tesseract';
        }
      }

      // Fallback to Tesseract if Google Vision is disabled or fails
      if (!this.useGoogleVision) {
        const tesseractResult = await this.processWithTesseract(filePath);
        text = tesseractResult.text;
        extractedData = await this.extractDocumentData(text, documentType, filePath);
        console.log('✅ Successfully processed with Tesseract');
      }

      console.log(`✅ Document processed successfully with ${ocrEngine}`);
      return {
        success: true,
        documentType,
        extractedText: text,
        extractedData,
        confidence: this.calculateConfidence(text, documentType),
        ocrEngine
      };

    } catch (error) {
      console.error('❌ OCR processing failed:', error);
      return {
        success: false,
        error: error.message,
        documentType
      };
    }
  }

  async processWithGoogleVision(filePath) {
    try {
      const visionClient = vision(); // Get the lazy-loaded client
      if (!visionClient) {
        throw new Error('Google Vision client not available');
      }

      // Read the file
      const fileBuffer = fs.readFileSync(filePath);
      const [result] = await visionClient.textDetection(fileBuffer);

      if (!result.textAnnotations || result.textAnnotations.length === 0) {
        throw new Error('No text detected in the image');
      }

      // The first annotation contains the full text
      const fullText = result.textAnnotations[0].description;

      return {
        success: true,
        text: fullText,
        annotations: result.textAnnotations
      };
    } catch (error) {
      console.error('Google Vision processing error:', error);
      throw error;
    }
  }

  async processWithTesseract(filePath) {
    try {
      const { data: { text } } = await this.worker.recognize(filePath);
      return {
        success: true,
        text: text || ''
      };
    } catch (error) {
      console.error('Tesseract processing error:', error);
      throw error;
    }
  }

  async extractDocumentData(text, documentType, filePath) {
    const data = {};

    switch (documentType.toLowerCase()) {
      case 'aadhaar':
        return this.extractAadhaarData(text);
      case 'pan':
        return this.extractPANData(text);
      case 'income':
      case 'income-certificate':
        return this.extractIncomeCertificateData(text);
      case 'caste':
      case 'caste-certificate':
        return this.extractCasteCertificateData(text);
      case 'education':
      case 'education-certificate':
        return this.extractEducationCertificateData(text);
      default:
        return this.extractGeneralData(text);
    }
  }

  extractAadhaarData(text) {
    const data = {};

    // Enhanced Aadhaar number extraction with better patterns
    const aadhaarPatterns = [
      // Standard formats
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,  // 1234 5678 9012 or 1234-5678-9012
      /\b\d{12}\b/g,                          // 123456789012
      /\b\d{4}\s*\d{4}\s*\d{4}\b/g,         // 1234    5678    9012
      // With Aadhaar/Virtual ID prefix
      /(?:aadhaar|uid|virtual\s*id|vid)[\s:]*[\d\s-]+?(\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/gi,
      // In context of Aadhaar card text
      /(?:number|no\.?)[\s:]*[\d\s-]+?(\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/gi,
    ];

    // Try each pattern until we find a valid Aadhaar number
    for (const pattern of aadhaarPatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        // Use the first group if it exists (for patterns with capture groups)
        const number = (match[1] || match[0]).replace(/[^0-9]/g, '');

        // Basic validation: should be 12 digits and not all same digits
        if (number.length === 12 && !/^(\d)\1{11}$/.test(number)) {
          data.aadhaarNumber = number;
          break;
        }
      }
      if (data.aadhaarNumber) break;
    }

    // Enhanced name extraction with better patterns and validation
    const namePatterns = [
      // Standard patterns with labels (English and regional languages)
      /(?:name|naam|ನಾಮ|ಹೆಸರು|नाम)[\s:：]+([^\n\r<>"]+)/i,
      /(?:name|naam|ನಾಮ|ಹೆಸರು|नाम)[\s\n]+([^\n\r<>"]+)/i,

      // Context-based patterns
      /(?:name of (?:individual|person)|(?:individual|person) name|full name)[\s:：]*([^\n\r<>"]+)/i,
      /(?:to|of|in (?:favour|favor)|ಎಂಬವರ|ಎಂಬವರಿಗೆ|ವ್ಯಕ್ತಿಗೆ|को)[\s:：]*([^\n\r<>"]+?)(?:\n|$|,|;|\s+[A-Z0-9])/i,

      // Common name patterns
      /(?:^|\n|\s)([A-Z][a-z]+(?:\s+[A-Z][a-z\.]+)+)(?:\n|$|\s+[A-Z0-9])/,  // Title Case Names
      /(?:^|\n|\s)([A-Z][A-Z\s]+[A-Z])(?:\n|$|\s+[A-Z0-9])/,  // UPPERCASE NAMES

      // Regional language names
      /([\u0C80-\u0CFF][\u0C80-\u0CFF\s]+[\u0C80-\u0CFF])(?:\n|$|\s+[^\u0C80-\u0CFF])/,  // Kannada
      /([\u0900-\u097F][\u0900-\u097F\s]+[\u0900-\u097F])(?:\n|$|\s+[^\u0900-\u097F])/,  // Hindi
      /([\u0A80-\u0AFF][\u0A80-\u0AFF\s]+[\u0A80-\u0AFF])(?:\n|$|\s+[^\u0A80-\u0AFF])/,  // Gujarati
      /([\u0B80-\u0BFF][\u0B80-\u0BFF\s]+[\u0B80-\u0BFF])(?:\n|$|\s+[^\u0B80-\u0BFF])/,  // Tamil
      /([\u0C00-\u0C7F][\u0C00-\u0C7F\s]+[\u0C00-\u0C7F])(?:\n|$|\s+[^\u0C00-\u0C7F])/,  // Telugu
      /([\u0980-\u09FF][\u0980-\u09FF\s]+[\u0980-\u09FF])(?:\n|$|\s+[^\u0980-\u09FF])/   // Bengali
    ];

    // Try to extract name using patterns
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && (match[1] || match[0])) {
        const potentialName = (match[1] || match[0]).trim();

        // Basic validation: name should be at least 3 chars, not just numbers/symbols
        if (potentialName.length >= 3 && /[\p{L}\s]{3,}/u.test(potentialName)) {
          // Clean up the extracted name
          data.name = potentialName
            .replace(/^[^\p{L}]+/u, '')  // Remove leading non-letters
            .replace(/[^\p{L}\s.-]+/ug, '')  // Remove remaining non-letters except spaces, dots, hyphens
            .replace(/\s+/g, ' ')  // Normalize spaces
            .trim();

          // If we found a name, try to extract more details
          if (data.name) {
            // Extract gender if present
            const genderMatch = text.match(/gender[\s:：]+([^\n\r<>"]+)/i) ||
              text.match(/(male|female|other|ಪುರುಷ|ಸ್ತ್ರೀ|ಇತರೆ|पुरुष|महिला|अन्य)/i);
            if (genderMatch) {
              const gender = genderMatch[1] || genderMatch[0];
              if (gender) data.gender = gender.trim();
            }

            // Extract date of birth if present
            const dobMatch = text.match(/(?:dob|date of birth|ಜನ್ಮ ದಿನಾಂಕ|जन्म तिथि)[\s:：]+([^\n\r<>"]+)/i);
            if (dobMatch && dobMatch[1]) {
              data.dateOfBirth = dobMatch[1].trim();
            }

            // Extract address if present (simplified)
            const addressMatch = text.match(/(?:address|ವಿಳಾಸ|पता)[\s:：]+([^\n\r<>"]+?)(?:\n\n|$|\s+[A-Z0-9])/is);
            if (addressMatch && addressMatch[1]) {
              data.address = addressMatch[1].trim();
            }

            break;
          }
        }
      }
    }

    // Date of Birth
    const dobPatterns = [
      /dob[:\s]*(\d{2}[-/]\d{2}[-/]\d{4})/i,
      /birth[:\s]*(\d{2}[-/]\d{2}[-/]\d{4})/i,
      /(\d{2}[-/]\d{2}[-/]\d{4})/g
    ];

    for (const pattern of dobPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.dateOfBirth = match[1];
        break;
      }
    }

    // Gender
    const genderPatterns = [
      /gender[:\s]*([MF])/i,
      /sex[:\s]*([MF])/i
    ];

    for (const pattern of genderPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.gender = match[1].toUpperCase();
        break;
      }
    }

    // Address extraction
    const addressMatch = text.match(/address[:\s]*([^\n\r]+)/i);
    if (addressMatch) {
      data.address = addressMatch[1].trim();
    }

    return data;
  }

  extractPANData(text) {
    const data = {};

    // PAN number pattern (5 letters + 4 digits + 1 letter)
    const panMatch = text.match(/\b[A-Z]{5}\d{4}[A-Z]\b/);
    if (panMatch) {
      data.panNumber = panMatch[0];
    }

    // Name extraction
    const nameMatch = text.match(/name[:\s]*([^\n\r]+)/i);
    if (nameMatch) {
      data.name = nameMatch[1].trim();
    }

    // Father's name
    const fatherMatch = text.match(/father['']*s?[:\s]*name[:\s]*([^\n\r]+)/i);
    if (fatherMatch) {
      data.fatherName = fatherMatch[1].trim();
    }

    // Date of Birth
    const dobMatch = text.match(/date[:\s]*of[:\s]*birth[:\s]*(\d{2}[-/]\d{2}[-/]\d{4})/i);
    if (dobMatch) {
      data.dateOfBirth = dobMatch[1];
    }

    return data;
  }

  extractIncomeCertificateData(text) {
    const data = {};

    // Income amount
    const incomePatterns = [
      /annual[:\s]*income[:\s]*₹?[\s]*(\d+[,.]*\d*)/i,
      /income[:\s]*₹?[\s]*(\d+[,.]*\d*)/i,
      /total[:\s]*income[:\s]*₹?[\s]*(\d+[,.]*\d*)/i
    ];

    for (const pattern of incomePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.annualIncome = match[1].replace(/[,\s]/g, '');
        break;
      }
    }

    // Name
    const nameMatch = text.match(/name[:\s]*([^\n\r]+)/i);
    if (nameMatch) {
      data.name = nameMatch[1].trim();
    }

    // Address
    const addressMatch = text.match(/address[:\s]*([^\n\r]+)/i);
    if (addressMatch) {
      data.address = addressMatch[1].trim();
    }

    return data;
  }

  extractCasteCertificateData(text) {
    const data = {};

    // Caste/Category
    const castePatterns = [
      /caste[:\s]*([^\n\r]+)/i,
      /category[:\s]*([^\n\r]+)/i,
      /belongs[:\s]*to[:\s]*([^\n\r]+)caste/i
    ];

    for (const pattern of castePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.caste = match[1].trim();
        break;
      }
    }

    // Certificate number
    const certMatch = text.match(/certificate[:\s]*no[:\s]*([^\n\r]+)/i);
    if (certMatch) {
      data.certificateNumber = certMatch[1].trim();
    }

    // Name
    const nameMatch = text.match(/name[:\s]*([^\n\r]+)/i);
    if (nameMatch) {
      data.name = nameMatch[1].trim();
    }

    return data;
  }

  extractEducationCertificateData(text) {
    const data = {};

    // Qualification/Degree
    const qualificationPatterns = [
      /degree[:\s]*([^\n\r]+)/i,
      /qualification[:\s]*([^\n\r]+)/i,
      /course[:\s]*([^\n\r]+)/i
    ];

    for (const pattern of qualificationPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.qualification = match[1].trim();
        break;
      }
    }

    // Institution/University
    const institutionMatch = text.match(/university[:\s]*([^\n\r]+)/i);
    if (institutionMatch) {
      data.institution = institutionMatch[1].trim();
    }

    // Year of passing
    const yearMatch = text.match(/year[:\s]*of[:\s]*passing[:\s]*(\d{4})/i);
    if (yearMatch) {
      data.yearOfPassing = yearMatch[1];
    }

    // Name
    const nameMatch = text.match(/name[:\s]*([^\n\r]+)/i);
    if (nameMatch) {
      data.name = nameMatch[1].trim();
    }

    return data;
  }

  extractGeneralData(text) {
    const data = {};

    // Extract any identifiable numbers (could be IDs, certificates, etc.)
    const numberPatterns = [
      /\b\d{12}\b/g,  // 12-digit numbers (Aadhaar-like)
      /\b[A-Z]{5}\d{4}[A-Z]\b/g,  // PAN-like patterns
      /\bcertificate[:\s]*no[:\s]*([^\n\r]+)/i,
      /\bid[:\s]*no[:\s]*([^\n\r]+)/i
    ];

    for (const pattern of numberPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        data.extractedNumbers = matches;
        break;
      }
    }

    // Extract names (looking for capitalized words)
    const nameMatches = text.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g);
    if (nameMatches && nameMatches.length > 0) {
      data.possibleNames = nameMatches;
    }

    return data;
  }

  calculateConfidence(text, documentType) {
    let confidence = 0;

    // Base confidence on text length and quality
    if (text.length > 50) confidence += 30;
    if (text.length > 100) confidence += 20;

    // Document-specific confidence boosts
    switch (documentType.toLowerCase()) {
      case 'aadhaar':
        if (/\d{4}\s*\d{4}\s*\d{4}/.test(text)) confidence += 40;
        break;
      case 'pan':
        if (/[A-Z]{5}\d{4}[A-Z]/.test(text)) confidence += 40;
        break;
      case 'income':
        if (/income|₹|rs\.?/i.test(text)) confidence += 30;
        break;
    }

    return Math.min(confidence, 100);
  }

  async validateDocumentData(extractedData, userData, documentType) {
    const validation = {
      isValid: true,
      confidence: 0,
      mismatches: [],
      suggestions: []
    };

    switch (documentType.toLowerCase()) {
      case 'aadhaar':
        return this.validateAadhaarData(extractedData, userData);
      case 'pan':
        return this.validatePANData(extractedData, userData);
      case 'income':
        return this.validateIncomeData(extractedData, userData);
      default:
        return validation;
    }
  }

  validateAadhaarData(extractedData, userData) {
    const validation = {
      isValid: true,
      confidence: 0,
      mismatches: [],
      suggestions: []
    };

    // Validate Aadhaar number format
    if (extractedData.aadhaarNumber) {
      if (!/^\d{12}$/.test(extractedData.aadhaarNumber)) {
        validation.mismatches.push('Aadhaar number format is invalid');
        validation.isValid = false;
      }
    }

    // Validate name similarity
    if (extractedData.name && userData.name) {
      const similarity = this.calculateStringSimilarity(extractedData.name, userData.name);
      validation.confidence += similarity * 30;

      if (similarity < 0.6) {
        validation.mismatches.push('Name in document does not match user input');
        validation.suggestions.push(`Document name: ${extractedData.name}, User input: ${userData.name}`);
      }
    }

    // Validate date of birth
    if (extractedData.dateOfBirth && userData.dateOfBirth) {
      const docDOB = new Date(extractedData.dateOfBirth);
      const userDOB = new Date(userData.dateOfBirth);

      if (docDOB.getTime() !== userDOB.getTime()) {
        validation.mismatches.push('Date of birth does not match');
        validation.isValid = false;
      } else {
        validation.confidence += 40;
      }
    }

    return validation;
  }

  validatePANData(extractedData, userData) {
    const validation = {
      isValid: true,
      confidence: 0,
      mismatches: [],
      suggestions: []
    };

    // Validate PAN format
    if (extractedData.panNumber) {
      if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(extractedData.panNumber)) {
        validation.mismatches.push('PAN number format is invalid');
        validation.isValid = false;
      }
    }

    // Validate name
    if (extractedData.name && userData.name) {
      const similarity = this.calculateStringSimilarity(extractedData.name, userData.name);
      validation.confidence += similarity * 40;

      if (similarity < 0.7) {
        validation.mismatches.push('Name in PAN card does not match user input');
        validation.suggestions.push(`PAN name: ${extractedData.name}, User input: ${userData.name}`);
      }
    }

    return validation;
  }

  validateIncomeData(extractedData, userData) {
    const validation = {
      isValid: true,
      confidence: 0,
      mismatches: [],
      suggestions: []
    };

    // Validate income amount
    if (extractedData.annualIncome && userData.annualIncome) {
      const extractedAmount = parseInt(extractedData.annualIncome.replace(/,/g, ''));
      const userAmount = parseInt(userData.annualIncome.replace(/,/g, ''));

      const difference = Math.abs(extractedAmount - userAmount);
      const tolerance = userAmount * 0.1; // 10% tolerance

      if (difference > tolerance) {
        validation.mismatches.push('Income amount in certificate does not match user input');
        validation.suggestions.push(`Certificate shows: ₹${extractedAmount}, User entered: ₹${userAmount}`);
      } else {
        validation.confidence += 50;
      }
    }

    return validation;
  }

  calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;

    // Simple similarity calculation (can be enhanced)
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  async cleanup() {
    if (this.worker) {
      await this.worker.terminate();
      this.isInitialized = false;
      console.log('🧹 OCR service cleaned up');
    }
  }
}

// Export for use in other modules
export default OCRService;

// For testing OCR service independently
if (import.meta.url === `file://${process.argv[1]}`) {
  const ocr = new OCRService();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('🛑 Shutting down OCR service...');
    await ocr.cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received, shutting down...');
    await ocr.cleanup();
    process.exit(0);
  });

  console.log('🔧 OCR Service ready for testing');
  console.log('💡 Usage: processDocument(filePath, documentType)');
}
