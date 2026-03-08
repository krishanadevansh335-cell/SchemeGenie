import fs from 'fs-extra';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

// Constants
const AADHAAR_REGEX = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
const PHONE_REGEX = /(?:\+91[\-\s]?|0)?[6-9]\d{9}\b/g;
const DOB_REGEX = /\b(0?[1-9]|[12][0-9]|3[01])[-\/\s](0?[1-9]|1[012])[-\/\s](19|20)\d{2}\b/;

/**
 * Normalize text by removing extra spaces and normalizing line breaks
 */
function normalizeText(text) {
  return (text || '').replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
}

/**
 * Find name from OCR text lines
 */
function findName(lines) {
  for (let i = 0; i < Math.min(8, lines.length); i++) {
    const l = lines[i].trim();
    if (!l) continue;
    // Skip header words that are common on Aadhaar cards
    if (/(government|india|uidai|unique|identity|official|republic)/i.test(l)) continue;
    // If line contains mostly letters and at least one space -> candidate
    if (/^[A-Z\s.'-]{3,}$/.test(l) && l.split(/\s+/).length <= 6) {
      return { text: l, index: i, score: 0.9 };
    }
  }
  // fallback: find first long uppercase-ish line anywhere
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (/^[A-Z\s.'-]{6,}$/.test(l)) return { text: l, index: i, score: 0.5 };
  }
  return null;
}

/**
 * Find address from OCR text lines
 */
function findAddress(lines, nameIndex) {
  // If "Address" label exists, start after it
  const addrLabelIndex = lines.findIndex(l => /address[:\s]/i.test(l));
  if (addrLabelIndex >= 0) {
    const block = lines.slice(addrLabelIndex + 1, addrLabelIndex + 6).join(', ').trim();
    if (block.length > 8) return { text: block, score: 0.8, index: addrLabelIndex + 1 };
  }

  if (typeof nameIndex === 'number' && nameIndex >= 0) {
    const block = lines.slice(nameIndex + 1, nameIndex + 8).join(', ').trim();
    if (block.length > 10) return { text: block, score: 0.75, index: nameIndex + 1 };
  }

  // fallback: last 4 lines
  const lastBlock = lines.slice(-4).join(', ').trim();
  return lastBlock.length > 6 ? { text: lastBlock, score: 0.4, index: lines.length - 4 } : null;
}

/**
 * Find Aadhaar number in text
 */
function findAadhaarNumber(rawText) {
  const mm = rawText.match(AADHAAR_REGEX);
  if (!mm) return null;
  // pick the most plausible: prefer one with spaces or the first occurrence
  let candidate = mm[0].replace(/\s+/g, '');
  if (candidate.length === 12) return candidate;
  // otherwise try other matches
  for (const m of mm) {
    const c = m.replace(/\s+/g, '');
    if (c.length === 12) return c;
  }
  return mm[0].replace(/\s+/g, '');
}

/**
 * Find phone number in text
 */
function findPhone(rawText) {
  const mm = rawText.match(PHONE_REGEX);
  if (!mm) return null;
  // pick first
  return mm[0];
}

/**
 * Preprocess image for better OCR
 */
async function preprocessImage(inputPath, outputPath) {
  await sharp(inputPath)
    .rotate() // auto-orient by EXIF
    .resize({ width: 1500, withoutEnlargement: true })
    .greyscale()
    .linear(1.1, -10) // slight contrast bolstering
    .sharpen()
    .toFile(outputPath);
  return outputPath;
}

/**
 * Extract text from image using Tesseract.js
 */
async function extractTextWithTesseract(imagePath) {
  const worker = await createWorker({
    logger: m => console.log(m.status) // optional progress logs
  });
  
  try {
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    const { data: { text } } = await worker.recognize(imagePath);
    return normalizeText(text);
  } finally {
    await worker.terminate();
  }
}

/**
 * Main OCR function to process Aadhaar card image
 */
async function processAadhaarImage(imagePath) {
  try {
    // Preprocess image
    const preprocessedPath = `${imagePath}-preproc.jpg`;
    await preprocessImage(imagePath, preprocessedPath);

    // Extract text using Tesseract
    const rawText = await extractTextWithTesseract(preprocessedPath);
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

    // Parse fields
    const aadhaar = findAadhaarNumber(rawText);
    const phone = findPhone(rawText);
    const nameCandidate = findName(lines);
    const addressCandidate = findAddress(lines, nameCandidate ? nameCandidate.index : -1);

    // Construct result
    const result = {
      success: true,
      text: rawText,
      parsed: {
        aadhaar: aadhaar || null,
        name: nameCandidate ? nameCandidate.text : null,
        address: addressCandidate ? addressCandidate.text : null,
        phone: phone || null,
        dob: (rawText.match(DOB_REGEX) || [null])[0]
      },
      meta: {
        aadhaarFound: !!aadhaar,
        phoneFound: !!phone,
        nameConfidence: nameCandidate ? nameCandidate.score : 0,
        addressConfidence: addressCandidate ? addressCandidate.score : 0
      }
    };

    // Clean up
    await fs.remove(preprocessedPath).catch(console.error);
    
    return result;
  } catch (error) {
    console.error('Aadhaar OCR error:', error);
    return {
      success: false,
      message: error.message || 'Failed to process Aadhaar image'
    };
  }
}

export { processAadhaarImage };
