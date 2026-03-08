import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import OCRService from '../ocr-service.js';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `aadhaar-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files (JPEG, JPG, PNG) and PDFs are allowed'));
  },
});

const router = express.Router();
const ocrService = new OCRService();

/**
 * @route   POST /api/ocr/aadhaar
 * @desc    Process Aadhaar card image and extract information
 * @access  Private
 */
router.post('/aadhaar', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    console.log(`Processing Aadhaar card: ${req.file.path}`);
    
    // Process the document
    const result = await ocrService.processDocument(req.file.path, 'aadhaar');
    
    if (!result.success) {
      // Clean up the uploaded file if processing failed
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
      
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to process Aadhaar card',
        ocrEngine: result.ocrEngine
      });
    }

    // If successful, keep the file for reference (in a real app, you might want to move it to persistent storage)
    // and return the extracted data
    res.json({
      success: true,
      message: 'Aadhaar card processed successfully',
      data: result.extractedData,
      ocrEngine: result.ocrEngine,
      filePath: req.file.path.replace(/\\/g, '/') // Convert Windows paths to forward slashes
    });

  } catch (error) {
    console.error('Aadhaar OCR error:', error);
    
    // Clean up the uploaded file if there was an error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Server error during Aadhaar processing'
    });
  }
});

/**
 * @route   GET /api/ocr/status
 * @desc    Check OCR service status
 * @access  Public
 */
router.get('/status', async (req, res) => {
  try {
    await ocrService.initialize();
    res.json({
      success: true,
      status: 'operational',
      ocrEngine: ocrService.useGoogleVision ? 'google-vision' : 'tesseract',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('OCR status check failed:', error);
    res.status(503).json({
      success: false,
      status: 'unavailable',
      error: error.message || 'OCR service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
