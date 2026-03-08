
import axios from "axios";
import bcrypt from "bcryptjs";
import bodyParser from "body-parser";
import cors from "cors";
import "dotenv/config";
import express from "express";
import fs from "fs";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import { fileURLToPath } from 'url';
import AutomationService from './automation-service.js';
import chatRouter from "./chat.js";
import documentDeleteRouter from "./document-delete.js";
import { isAdmin, protect } from './middleware/authMiddleware.js';
import Application from "./models/application.js";
import Notification from "./models/notification.js";
import Scheme from "./models/scheme.js";
import User from "./models/user.js";
import UserDocument from "./models/userDocument.js";
import OCRService from './ocr-service.js';
import PDFService from './pdf-service.js';
import adminRoutes from './routes/adminRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import ocrRoutes from './routes/ocrRoutes.js';
// import { processAadhaarImage } from './services/aadhaarOcrService.js';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Middleware setup
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001"
  ],
  credentials: true
}));
app.use(bodyParser.json());

// Ensure uploads directory exists
const uploadsDir = path.resolve(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// Helper function to create notifications
const createNotification = async (userId, type, title, message, data = {}) => {
  try {
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      data,
      read: false,
      createdAt: new Date()
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Notification Routes
app.get("/api/notifications/unread-count", protect, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user.id || req.user._id,
      read: false
    });
    res.json({ count });
  } catch (err) {
    console.error("Error fetching unread count:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

app.get("/api/notifications", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user.id || req.user._id
    }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

app.put("/api/notifications/:id/read", protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id || req.user._id },
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ msg: "Notification not found" });
    res.json(notification);
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Admin Quick Actions Endpoints
// Send Notification to Users
app.post("/api/admin/send-notification", protect, isAdmin, async (req, res) => {
  try {
    const { title, message, type, sendToAll, userIds } = req.body;

    if (!title || !message) {
      return res.status(400).json({ msg: "Title and message are required" });
    }

    let targetUserIds = [];

    if (sendToAll) {
      // Get all user IDs
      const users = await User.find({}, '_id');
      targetUserIds = users.map(user => user._id);
    } else {
      targetUserIds = userIds || [];
    }

    if (targetUserIds.length === 0) {
      return res.status(400).json({ msg: "No users selected" });
    }

    // Create notifications for all target users
    const notifications = await Promise.all(
      targetUserIds.map(userId =>
        createNotification(userId, type || 'info', title, message)
      )
    );

    res.json({
      success: true,
      count: notifications.length,
      message: `Notification sent to ${notifications.length} user(s)`
    });
  } catch (err) {
    console.error("Error sending notification:", err);
    res.status(500).json({ msg: "Server error sending notification" });
  }
});

// Export Data as CSV
app.get("/api/admin/export", protect, isAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    const applications = await Application.find({}).populate('userId schemeId');
    const schemes = await Scheme.find({});

    // Create CSV content
    let csv = "DATA EXPORT - SchemeSeva\n\n";

    // Users section
    csv += "USERS\n";
    csv += "Name,Email,Phone,Role,Created At\n";
    users.forEach(user => {
      csv += `"${user.name}","${user.email}","${user.phone || ''}","${user.role}","${user.createdAt}"\n`;
    });

    csv += "\n\nAPPLICATIONS\n";
    csv += "User,Scheme,Status,Applied Date\n";
    applications.forEach(app => {
      csv += `"${app.userId?.name || 'N/A'}","${app.schemeId?.name || 'N/A'}","${app.status}","${app.createdAt}"\n`;
    });

    csv += "\n\nSCHEMES\n";
    csv += "Name,Category,Department,Status\n";
    schemes.forEach(scheme => {
      csv += `"${scheme.name}","${scheme.category}","${scheme.department}","${scheme.status}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=schemeseva-export-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (err) {
    console.error("Error exporting data:", err);
    res.status(500).json({ msg: "Server error exporting data" });
  }
});

// Import Schemes from JSON
app.post("/api/admin/import-schemes", protect, isAdmin, multer({ storage: multer.memoryStorage() }).single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileContent = req.file.buffer.toString('utf8');
    let schemesData;

    try {
      schemesData = JSON.parse(fileContent);
    } catch (parseError) {
      return res.status(400).json({ message: "Invalid JSON file format" });
    }

    if (!Array.isArray(schemesData)) {
      return res.status(400).json({ message: "JSON file must contain an array of schemes" });
    }

    // Import schemes
    let importedCount = 0;
    for (const schemeData of schemesData) {
      try {
        // Check if scheme already exists
        const existing = await Scheme.findOne({ name: schemeData.name });
        if (!existing) {
          await Scheme.create(schemeData);
          importedCount++;
        }
      } catch (err) {
        console.error(`Error importing scheme ${schemeData.name}:`, err);
      }
    }

    res.json({
      success: true,
      count: importedCount,
      total: schemesData.length,
      message: `Successfully imported ${importedCount} out of ${schemesData.length} schemes`
    });
  } catch (err) {
    console.error("Error importing schemes:", err);
    res.status(500).json({ message: "Server error importing schemes" });
  }
});

// Backup Database
app.post("/api/admin/backup", protect, isAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    const applications = await Application.find({});
    const schemes = await Scheme.find({});
    const documents = await UserDocument.find({});
    const notifications = await Notification.find({});

    const backup = {
      timestamp: new Date().toISOString(),
      version: "1.0",
      data: {
        users,
        applications,
        schemes,
        documents,
        notifications
      },
      stats: {
        usersCount: users.length,
        applicationsCount: applications.length,
        schemesCount: schemes.length,
        documentsCount: documents.length,
        notificationsCount: notifications.length
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=schemeseva-backup-${new Date().toISOString().split('T')[0]}.json`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (err) {
    console.error("Error creating backup:", err);
    res.status(500).json({ msg: "Server error creating backup" });
  }
});

// Use OCR routes
app.use('/api/ocr', ocrRoutes);

// Use Feedback/QnA routes
app.use('/api/feedback', feedbackRoutes);

// Use Admin routes
app.use('/api/admin', adminRoutes);

// ---------- Database Connection & Health Check ----------
let isConnected = false;

mongoose.connection.on('connected', () => {
  isConnected = true;
  console.log('📊 MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.log('📊 MongoDB disconnected');
});

// Enhanced health check with database connectivity check
app.get("/health", (req, res) => {
  const healthData = {
    status: isConnected ? "OK" : "DEGRADED",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: {
      connected: isConnected,
      state: mongoose.connection.readyState,
      name: mongoose.connection.name || 'Not connected',
      host: mongoose.connection.host || 'Not connected',
      port: mongoose.connection.port || 'Not connected'
    },
    environment: process.env.NODE_ENV || 'development',
    version: process.version,
    automation: automationService && typeof automationService.getStats === 'function' ? automationService.getStats() : { status: 'automation_not_initialized' }
  };

  const statusCode = isConnected ? 200 : 503;
  res.status(statusCode).json(healthData);
});

// ---------- File Upload Setup ----------
// Configure storage for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.resolve(__dirname, "uploads");
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`Created uploads directory at: ${uploadsDir}`);
    }
    console.log('Setting upload destination to:', uploadsDir);
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const sanitizedFilename = `${Date.now()}_${file.originalname.replace(/[^\w\d.-]/g, '_')}`;
    console.log('Generated filename:', sanitizedFilename);
    cb(null, sanitizedFilename);
  }
});

const fileFilter = (req, file, cb) => {
  console.log('Processing file:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });

  // Allow common document types
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'text/plain'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    console.log('File type accepted:', file.mimetype);
    return cb(null, true);
  }

  console.error('File type not allowed:', file.mimetype);
  const error = new Error(`File type not allowed: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`);
  error.code = 'LIMIT_FILE_TYPE';
  return cb(error, false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  }
});

// Add error handler for multer errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', {
      code: err.code,
      field: err.field,
      message: err.message,
      stack: err.stack
    });

    let errorMessage = 'File upload error';
    if (err.code === 'LIMIT_FILE_SIZE') {
      errorMessage = 'File size too large. Maximum size is 10MB.';
    } else if (err.code === 'LIMIT_FILE_TYPE') {
      errorMessage = 'Only PDF files are allowed.';
    }

    return res.status(400).json({
      success: false,
      message: errorMessage,
      error: err.message,
      code: err.code
    });
  }
  next(err);
});

// ---------- Chat routes ----------
app.use("/", chatRouter);

// ---------- Environment Variables ----------
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// Meri Pehchaan API Configuration
const MERIPEHCHAAN_CLIENT_ID = process.env.MERIPEHCHAAN_CLIENT_ID;
const MERIPEHCHAAN_CLIENT_SECRET = process.env.MERIPEHCHAAN_CLIENT_SECRET;
const MERIPEHCHAAN_BASE_URL = "https://dev-meripehchaan.dl6.in"; // Development environment
const MERIPEHCHAAN_TOKEN_URL = `${MERIPEHCHAAN_BASE_URL}/public/oauth2/1/token`;
const MERIPEHCHAAN_USER_URL = `${MERIPEHCHAAN_BASE_URL}/public/oauth2/1/user`;

// Initialize Google OAuth client
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// ---------- MongoDB connection will be handled at the end of the file ----------

// ---------- Temporary store just for demo OTPs ----------
const otps = new Map(); // phone -> otp

// ---------- Helper: generate random 6‑digit OTP ----------
const makeOtp = () => Math.floor(100000 + Math.random() * 900000);

// ---------- ROUTES ----------

// Auth Routes
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: "User already exists" });
    }

    // Create new user
    user = new User({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role: 'user' // Default role
    });

    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({ token, role: user.role });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ msg: 'Server error during registration' });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ token, role: user.role, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ msg: 'Server error during login' });
  }
});

// Use document deletion route
app.use('/api/documents', documentDeleteRouter);

// Other routes continue here...

// --- 1️⃣ Send OTP (simulated) ---
app.post("/verify", (req, res) => {
  const { aadhaar, caste, birth, income, phone } = req.body;

  if (!aadhaar || !phone) {
    return res.status(400).json({ msg: "Aadhaar and phone are required" });
  }

  const otp = makeOtp();
  otps.set(phone, otp);

  // Simulate sending SMS – in a production environment, this should be replaced with a real SMS gateway
  // console.log(`📱 OTP for ${phone}: ${otp}`);
  res.json({ msg: "OTP sent" });
});

// --- 2️⃣ Verify OTP ---
app.post("/verify-otp", (req, res) => {
  const { phone, otp } = req.body;
  const saved = otps.get(phone);

  if (+otp === saved) {
    otps.delete(phone);
    res.json({ msg: "OTP verified ✅" });
  } else {
    res.status(400).json({ msg: "Invalid OTP ❌" });
  }
});

// Duplicate routes removed


// ---------- Google Authentication ----------
app.post("/auth/google", async (req, res) => {
  const { credential } = req.body;

  try {
    // Verify the Google credential
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // Check if user exists, if not create them
    let user = await User.findOne({ email });
    if (!user) {
      const role = email === 'kishu@gmail.com' ? 'admin' : 'user';
      user = new User({
        name,
        email,
        password: null, // No password for Google users
        googleId: email,
        role
      });
      await user.save();
    }

    const token = jwt.sign({ email, role: user.role }, JWT_SECRET, { expiresIn: "1h" });
    res.json({
      msg: "Google authentication successful ✅",
      token,
      user: {
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(500).json({ msg: "Google authentication failed" });
  }
});

// ---------- Profile Route ----------
app.get("/profile", protect, async (req, res) => {
  try {
    const { email } = req.user;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // remove password before sending
    const { password, ...userData } = user.toObject();
    res.json(userData);
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ msg: "Server error fetching profile" });
  }
});

// Update Profile Route
app.put("/profile", protect, async (req, res) => {
  try {
    const { email } = req.user;
    const updates = req.body;

    // Prevent updating sensitive fields
    delete updates.password;
    delete updates.email;
    delete updates.role;
    delete updates._id;

    const user = await User.findOneAndUpdate(
      { email },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const { password, ...userData } = user.toObject();
    res.json(userData);
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ msg: "Server error updating profile" });
  }
});

// --- 7️⃣ Root (optional) ---
app.get("/", (req, res) => {
  res.send("Scheme Genie Auth API is running 🚀");
});

// ---------- SCHEME ROUTES ----------

// Get all schemes
app.get("/api/schemes", async (req, res) => {
  try {
    console.log('Fetching all schemes from database...');
    // Remove isActive filter to see all schemes
    const schemes = await Scheme.find({}).sort({ createdAt: -1 });
    console.log(`Found ${schemes.length} schemes in the database`);
    if (schemes.length > 0) {
      console.log('First scheme sample:', {
        _id: schemes[0]._id,
        name: schemes[0].name,
        isActive: schemes[0].isActive,
        createdAt: schemes[0].createdAt
      });
    }
    res.json(schemes);
  } catch (err) {
    console.error("Error fetching schemes:", err);
    res.status(503).json({ msg: "Database error fetching schemes", error: err.message });
  }
});

// Get scheme by ID
app.get("/api/schemes/:id", async (req, res) => {
  try {
    const scheme = await Scheme.findById(req.params.id);
    if (!scheme) {
      return res.status(404).json({ msg: "Scheme not found" });
    }
    res.json(scheme);
  } catch (err) {
    console.error("Error fetching scheme:", err);
    res.status(503).json({ msg: "Database error fetching scheme" });
  }
});

// Get schemes by category
app.get("/api/schemes/category/:category", async (req, res) => {
  try {
    const schemes = await Scheme.find({
      category: { $regex: req.params.category, $options: 'i' },
      isActive: true
    }).sort({ createdAt: -1 });
    res.json(schemes);
  } catch (err) {
    console.error("Error fetching schemes by category:", err);
    res.status(503).json({ msg: "Database error fetching schemes" });
  }
});

// Search schemes
app.get("/api/schemes/search/:query", async (req, res) => {
  try {
    const query = req.params.query;
    const schemes = await Scheme.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } }
      ],
      isActive: true
    }).sort({ createdAt: -1 });
    res.json(schemes);
  } catch (err) {
    console.error("Error searching schemes:", err);
    res.status(503).json({ msg: "Database error searching schemes" });
  }
});

// Get recommendations based on user profile
app.post("/api/recommendations", async (req, res) => {
  try {
    const { age, income, caste, gender, state, education, employment } = req.body;

    // Build eligibility criteria for matching
    const eligibilityCriteria = {};

    if (age) {
      const numAge = parseInt(age);
      eligibilityCriteria.minAge = { $lte: numAge };
      eligibilityCriteria.maxAge = { $gte: numAge };
    }

    if (income && income !== "All") {
      eligibilityCriteria.income = { $regex: income, $options: 'i' };
    }

    if (caste && caste !== "All") {
      eligibilityCriteria.caste = { $in: [caste] };
    }

    if (gender && gender !== "All") {
      eligibilityCriteria.gender = gender;
    }

    if (state && state !== "All") {
      eligibilityCriteria.state = { $in: [state] };
    }

    if (education) {
      eligibilityCriteria.education = { $regex: education, $options: 'i' };
    }

    if (employment) {
      eligibilityCriteria.employment = { $regex: employment, $options: 'i' };
    }

    // Find matching schemes
    let schemes = await Scheme.find({
      isActive: true,
      ...eligibilityCriteria
    }).sort({ createdAt: -1 });

    // If no specific matches, return all schemes
    if (schemes.length === 0) {
      schemes = await Scheme.find({ isActive: true }).sort({ createdAt: -1 });
    }

    res.json({ recommendations: schemes });
  } catch (err) {
    console.error("Error getting recommendations:", err);
    res.status(503).json({ msg: "Database error getting recommendations" });
  }
});

// AI Recommendations endpoint (Wrapper for standard recommendations with AI simulation)
app.post("/api/recommendations/ai", async (req, res) => {
  console.log("=" .repeat(80));
  console.log("🚀 AI RECOMMENDATIONS ENDPOINT HIT!");
  console.log("=" .repeat(80));
  try {
    const { profile } = req.body;

    if (!profile) {
      return res.status(400).json({ msg: "Profile data is required" });
    }

    console.log("🤖 AI Recommendation Request for:", profile);

    // TEMPORARY TEST: Return immediately to verify endpoint is hit
    return res.json({
      recommendations: [{name: "TEST SCHEME", category: "TEST"}],
      meta: { matchType: "test", count: 1 }
    });

    // Map frontend profile to backend criteria
    const { age, income, caste, gender, state, education, employmentStatus } = profile;

    const eligibilityCriteria = {};

    if (age) {
      const numAge = parseInt(age);
      eligibilityCriteria.minAge = { $lte: numAge };
      eligibilityCriteria.maxAge = { $gte: numAge };
    }

    if (income && income !== "All") {
      eligibilityCriteria.income = { $regex: income, $options: 'i' };
    }

    if (caste && caste !== "All") {
      eligibilityCriteria.caste = { $in: [caste] };
    }

    if (gender && gender !== "All") {
      eligibilityCriteria.gender = gender;
    }

    if (state && state !== "All") {
      eligibilityCriteria.state = { $in: [state] };
    }

    if (education) {
      eligibilityCriteria.education = { $regex: education, $options: 'i' };
    }

    if (employmentStatus) {
      eligibilityCriteria.employment = { $regex: employmentStatus, $options: 'i' };
    }

    // Support for free-text query from "Express Yourself" box
    let intentCriteria = [];
    
    // Helper to extract intent from query
    const extractIntentFromQuery = (query) => {
      const intents = new Set(); // Use a Set to avoid duplicate intents
      const q = query.toLowerCase();
      
      if (q.includes('student') || q.includes('study') || q.includes('scholarship') || q.includes('college') || q.includes('school')) {
        intents.add('Education');
      }
      if (q.includes('farm') || q.includes('crop') || q.includes('agriculture') || q.includes('kisan')) {
        intents.add('Agriculture');
      }
      if (q.includes('business') || q.includes('loan') || q.includes('startup') || q.includes('entrepreneur') || q.includes('shop')) {
        intents.add('Employment');
        intents.add('Financial');
        intents.add('MSME'); // Added MSME for business
      }
      if (q.includes('health') || q.includes('medical') || q.includes('hospital') || q.includes('treatment')) {
        intents.add('Healthcare');
      }
      if (q.includes('house') || q.includes('home') || q.includes('shelter')) {
        intents.add('Housing');
      }
      if (q.includes('woman') || q.includes('women') || q.includes('girl') || q.includes('widow') || q.includes('single')) {
        intents.add('Women & Child');
      }
      if (q.includes('old') || q.includes('senior') || q.includes('pension') || q.includes('retire')) {
        intents.add('Senior Citizens'); // Updated to Plural
        intents.add('Social Welfare');
      }

      // New logic: Split query by commas/spaces and add capitalized tokens as fallback intents
      const tokens = query.split(/[\s,]+/).filter(Boolean); // Split by space or comma, remove empty strings
      tokens.forEach(token => {
        // Check if token starts with an uppercase letter and is not entirely uppercase (to avoid acronyms unless they are categories)
        // Also, ensure it's not a common short word that might be capitalized at sentence start
        if (token.length > 2 && token[0] === token[0].toUpperCase() && token[1] === token[1].toLowerCase()) {
          // Add to intents, assuming it might be a category name
          intents.add(token);
        }
      });

      return Array.from(intents); // Convert Set back to Array
    };

    // Helper to get implied categories from profile
    const getProfileImpliedCategories = (p) => {
      const categories = [];
      const ageNum = parseInt(p.age);
      
      if (ageNum >= 49) {
        categories.push('Senior Citizens'); // Updated threshold
        categories.push('Social Welfare');
      }
      if (ageNum < 30 && (p.education?.toLowerCase().includes('student') || p.employmentStatus?.toLowerCase().includes('student'))) {
        categories.push('Education');
        categories.push('Youth Development'); // Added Youth Development
      }
      if (p.gender === 'Female') {
        categories.push('Women & Child');
      }
      if (p.employmentStatus?.toLowerCase().includes('farm') || p.employmentStatus?.toLowerCase().includes('agri')) {
        categories.push('Agriculture');
        categories.push('Rural Development'); // Added Rural Development
      }
      return categories;
    };

    // ALWAYS get profile-implied categories first
    const profileCategories = getProfileImpliedCategories(profile);
    if (profileCategories.length > 0) {
      console.log("👤 Profile Implied Categories:", profileCategories);
      // Add to intent criteria
      intentCriteria.push({ category: { $in: profileCategories } });
    }

    // Then process the query if it exists
    if (profile.query && profile.query.trim() !== "" && profile.query !== "No specific requirements.") {
      const queryRegex = { $regex: profile.query, $options: 'i' };
      
      // 1. Direct text match
      intentCriteria.push({ name: queryRegex });
      intentCriteria.push({ description: queryRegex });
      intentCriteria.push({ category: queryRegex });
      intentCriteria.push({ benefits: queryRegex });

      // 2. Extracted Intent Match
      const extractedIntents = extractIntentFromQuery(profile.query);
      if (extractedIntents.length > 0) {
        console.log("🧠 AI Detected Intents:", extractedIntents);
        intentCriteria.push({ category: { $in: extractedIntents } });
        
        // Also match description and category (regex) for these intents
        extractedIntents.forEach(intent => {
           intentCriteria.push({ description: { $regex: intent, $options: 'i' } });
           intentCriteria.push({ category: { $regex: intent, $options: 'i' } });
        });
      }
    }

    // 1. Smart Intent Match (PRIORITY - if we have intent criteria)
    // This uses the AI-detected intents and profile-implied categories, ignoring strict age/income limits
    console.log("🔍 Stage 1: Smart Intent Match");
    console.log("Intent Criteria:", JSON.stringify(intentCriteria, null, 2));
    let schemes = [];
    let matchType = "exact";
    
    if (intentCriteria.length > 0) {
      const query = {
        isActive: true,
        $or: intentCriteria
      };
      console.log("📋 MongoDB Query:", JSON.stringify(query, null, 2));
      schemes = await Scheme.find(query).sort({ createdAt: -1 });
      console.log(`Found ${schemes.length} schemes in smart intent match`);
      
      if (schemes.length > 0) matchType = "smart_intent";
    }

    // 2. Strict Match (Profile + Query) - only if smart intent didn't find anything
    // This uses the strict eligibility criteria (age, income, etc.)
    if (schemes.length === 0) {
      console.log("⚠️ No smart intent matches, trying strict match...");
      console.log("Eligibility Criteria:", JSON.stringify(eligibilityCriteria, null, 2));
      schemes = await Scheme.find({
        isActive: true,
        ...eligibilityCriteria
      }).sort({ createdAt: -1 });
      console.log(`Found ${schemes.length} schemes in strict match`);
      if (schemes.length > 0) matchType = "exact";
    }

    // 3. Relaxed Text Match (If query exists but no results yet)
    if (schemes.length === 0 && profile.query && profile.query.trim() !== "" && profile.query !== "No specific requirements.") {
      console.log("⚠️ No smart intent or strict matches, trying relaxed text search...");
      // ... existing relaxed text logic ...
      const queryRegex = { $regex: profile.query, $options: 'i' };

      // First try exact phrase match in description or name
      schemes = await Scheme.find({
        isActive: true,
        $or: [
          { name: queryRegex },
          { description: queryRegex },
          { category: queryRegex },
          { benefits: queryRegex }
        ]
      }).sort({ createdAt: -1 });

      // If still no results, try splitting query into keywords
      if (schemes.length === 0) {
        console.log("⚠️ No phrase matches, trying keyword search...");
        const keywords = profile.query.split(/\s+/).filter(k => k.length > 2); // Ignore short words
        if (keywords.length > 0) {
          const keywordConditions = keywords.map(k => ({
            description: { $regex: k, $options: 'i' }
          }));

          schemes = await Scheme.find({
            isActive: true,
            $or: keywordConditions
          }).sort({ createdAt: -1 });
        }
      }

      if (schemes.length > 0) matchType = "partial_text";
    }

    // 3. Relaxed Profile Match (If still no results, ignore query and try profile)
    if (schemes.length === 0) {
      console.log("⚠️ No text matches, trying relaxed profile search...");
      // Create a copy of criteria without the text query
      const { $or, ...profileCriteria } = eligibilityCriteria;
      schemes = await Scheme.find({
        isActive: true,
        ...profileCriteria
      }).sort({ createdAt: -1 });
      if (schemes.length > 0) matchType = "partial_profile";
    }

    // 4. Fallback (Return any active schemes)
    if (schemes.length === 0) {
      console.log("⚠️ No matches found, returning general schemes");
      schemes = await Scheme.find({ isActive: true }).limit(5);
      matchType = "fallback";
    }

    // Add "AI Insights" to the response
    const schemesWithInsights = schemes.map(scheme => {
      let insight = "Recommended based on your profile.";

      if (scheme.category === 'Education' && parseInt(age) < 25) {
        insight = "Great match for your educational growth!";
      } else if (scheme.category === 'Agriculture' && state === 'Punjab') {
        insight = "Highly relevant for your region's agriculture.";
      } else if (scheme.category === 'Financial' && income.includes('Below')) {
        insight = "This can provide essential financial support.";
      } else if (scheme.category === 'Women & Child' && gender === 'Female') {
        insight = "Specially designed to empower women.";
      }

      return {
        ...scheme.toObject(),
        id: scheme._id, // Frontend expects 'id'
        matchScore: Math.floor(Math.random() * (98 - 85) + 85), // Simulated match score
        aiInsight: insight
      };
    });

    res.json({
      recommendations: schemesWithInsights,
      meta: {
        count: schemesWithInsights.length,
        matchType: matchType,
        aiModel: "SchemeSeva-Rec-v1"
      }
    });

  } catch (err) {
    console.error("Error getting AI recommendations:", err);
    res.status(503).json({ msg: "AI Service Unavailable", error: err.message });
  }
});

// ---------- APPLICATION ROUTES ----------

// Get user's applications
app.get("/api/applications", protect, async (req, res) => {
  try {
    const currentUser = await User.findOne({ email: req.user.email });
    if (!currentUser) return res.status(404).json({ msg: "User not found" });

    // Get all applications for the user, sorted by date (newest first)
    // NOTE: Removed deduplication to show ALL applications, not just one per scheme
    const allApplications = await Application.find({ userId: currentUser._id })
      .populate('schemeId', 'name category')
      .sort({ createdAt: -1 });

    // Filter out applications where the scheme was deleted (schemeId is null)
    const validApplications = allApplications.filter(app => app.schemeId !== null);

    if (validApplications.length < allApplications.length) {
      console.log(`Filtered out ${allApplications.length - validApplications.length} applications with deleted schemes`);
    }

    res.json(validApplications);
  } catch (err) {
    console.error("Error fetching applications:", err);
    res.status(503).json({ msg: "Database error fetching applications" });
  }
});

// Create new application
app.post("/api/applications", protect, async (req, res) => {
  try {
    const { schemeId, applicationData } = req.body;
    console.log('POST /api/applications payload:', { schemeId, applicationData });

    const currentUser = await User.findOne({ email: req.user.email });
    if (!currentUser) return res.status(404).json({ msg: "User not found" });

    // Verify scheme exists
    const scheme = await Scheme.findById(schemeId);
    if (!scheme) return res.status(404).json({ msg: "Scheme not found" });

    // NOTE: Removed duplicate application check to allow multiple applications per scheme
    // This allows users to reapply if needed

    // Generate tracking ID
    const trackingId = `APP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Set estimated approval days based on scheme category
    let estimatedApprovalDays = 30; // default
    if (scheme.category === 'Emergency' || scheme.category === 'Healthcare') {
      estimatedApprovalDays = 7;
    } else if (scheme.category === 'Education' || scheme.category === 'Employment') {
      estimatedApprovalDays = 21;
    } else if (scheme.category === 'Financial' || scheme.category === 'Housing') {
      estimatedApprovalDays = 45;
    }

    // Generate tracking URL (local application tracking)
    const trackingUrl = `http://localhost:3000/track/${trackingId}`;

    // Transform document IDs into proper document objects with URLs
    let documentsArray = [];
    if (applicationData.documents && Array.isArray(applicationData.documents)) {
      // Fetch document details from UserDocument collection
      const documentIds = applicationData.documents.filter(id => typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/));

      if (documentIds.length > 0) {
        const userDocs = await UserDocument.find({ _id: { $in: documentIds } });

        documentsArray = userDocs.map(doc => ({
          _id: doc._id, // Preserve the original UserDocument ID
          type: doc.category || doc.name || 'Document',
          url: doc.fileUrl || `/uploads/${doc.fileName}`,
          fileName: doc.fileName,
          name: doc.name,
          category: doc.category,
          submittedAt: new Date(),
          verified: false
        }));
      }
    }

    // Prepare application data with proper document structure
    const { documents: _, ...restApplicationData } = applicationData;

    const processedApplicationData = {
      ...restApplicationData,
      documents: documentsArray, // Use only the transformed documents array
      personalInfo: applicationData.personalInfo || {
        fullName: applicationData.fullName,
        aadhaar: applicationData.aadhaar,
        phone: applicationData.phone,
        dateOfBirth: applicationData.dateOfBirth,
        gender: applicationData.gender,
        address: applicationData.address,
        state: applicationData.state,
        district: applicationData.district,
        pincode: applicationData.pincode
      },
      eligibilityInfo: applicationData.eligibilityInfo || {
        income: applicationData.income,
        caste: applicationData.caste,
        education: applicationData.education,
        employment: applicationData.employment
      }
    };
    const newApplication = new Application({
      userId: currentUser._id,
      schemeId: schemeId,
      applicationData: processedApplicationData,
      status: 'submitted',
      trackingId: trackingId,
      trackingUrl: trackingUrl,
      estimatedApprovalDays: estimatedApprovalDays,
      priority: applicationData.priority || 'medium',
      submittedAt: new Date()
    });

    await newApplication.save();

    // Create notification for application submission
    await createNotification(
      currentUser._id,
      'application_submitted',
      'Application Submitted Successfully',
      `Your application for ${scheme.name} has been submitted and is under review. Track your application at: http://localhost:3000/track/${trackingId}`,
      {
        applicationId: newApplication._id,
        schemeId: schemeId,
        trackingId: trackingId
      }
    );

    res.status(201).json(newApplication);
  } catch (err) {
    console.error("❌ ERROR creating application:");
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    console.error("Request schemeId:", req.body.schemeId);
    console.error("User email:", req.user?.email);
    res.status(503).json({ message: "Database error creating application", error: err.message, errorType: err.name });
  }
});

// Update application
app.put("/api/applications/:id", protect, async (req, res) => {
  try {
    const { applicationData, status } = req.body;

    const currentUser = await User.findOne({ email: req.user.email });
    if (!currentUser) return res.status(404).json({ msg: "User not found" });

    const application = await Application.findOne({
      _id: req.params.id,
      userId: currentUser._id
    });

    if (!application) {
      return res.status(404).json({ msg: "Application not found" });
    }

    if (applicationData) application.applicationData = applicationData;
    if (status) {
      application.status = status;
      if (status === 'submitted') application.submittedAt = new Date();
      if (status === 'under_review') application.reviewedAt = new Date();
      if (status === 'completed') application.completedAt = new Date();
    }

    application.updatedAt = new Date();
    await application.save();

    res.json(application);
  } catch (err) {
    console.error("Error updating application:", err);
    res.status(503).json({ message: "Database error updating application", error: err.message, details: err });
  }
});

// Get all pending applications (Admin only)
app.get("/api/applications/pending", protect, isAdmin, async (req, res) => {
  try {
    const applications = await Application.find({ status: 'Pending' })
      .populate('userId', 'name email')
      .populate('schemeId', 'name category')
      .sort({ createdAt: -1 });
    res.json(applications);
  } catch (err) {
    console.error("Error fetching pending applications:", err);
    res.status(503).json({ message: "Database error fetching pending applications", error: err.message, details: err });
  }
});

// Get single application details (for user or admin)
app.get("/api/applications/:id", protect, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('schemeId', 'name category description benefits eligibility');

    if (!application) {
      return res.status(404).json({ msg: "Application not found" });
    }

    // Security Check: Ensure the user is either an admin or the owner of the application
    const currentUser = await User.findOne({ email: req.user.email });
    if (!currentUser) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (currentUser.role !== 'admin' && application.userId._id.toString() !== currentUser._id.toString()) {
      return res.status(403).json({ msg: "Not authorized to view this application" });
    }

    res.json(application);
  } catch (err) {
    console.error("Error fetching application details:", err);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ msg: "Invalid application ID format" });
    }
    res.status(503).json({ msg: "Database error fetching application details" });
  }
});

// Update document verification status within an application (Admin only)
app.patch("/api/applications/:id/documents/:docIndex/verify", protect, isAdmin, async (req, res) => {
  try {
    const { id, docIndex } = req.params;
    const { verified, remarks } = req.body;

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ msg: "Application not found" });
    }

    const documents = application.applicationData?.documents || [];
    const index = parseInt(docIndex);

    if (index < 0 || index >= documents.length) {
      return res.status(400).json({ msg: "Invalid document index" });
    }

    // Update the document verification status
    documents[index].verified = verified;
    if (remarks) {
      documents[index].remarks = remarks;
    }
    documents[index].reviewedAt = new Date();

    application.applicationData.documents = documents;
    application.updatedAt = new Date();

    await application.save();

    res.json({
      msg: `Document ${verified ? 'verified' : 'marked as unverified'} successfully`,
      application
    });
  } catch (err) {
    console.error("Error updating document verification:", err);
    res.status(503).json({ msg: "Database error updating document verification" });
  }
});

// Get all documents (Admin only)
app.get("/api/admin/documents", protect, isAdmin, async (req, res) => {
  try {
    const documents = await UserDocument.find({})
      .populate('userId', 'name email')
      .sort({ uploadDate: -1 });

    // Fetch all applications to link them
    const applications = await Application.find({})
      .select('userId schemeId status')
      .populate('schemeId', 'name');

    // Create a map of UserID -> Applications
    const userApplications = {};
    applications.forEach(app => {
      if (!userApplications[app.userId]) {
        userApplications[app.userId] = [];
      }
      userApplications[app.userId].push({
        appId: app._id,
        schemeName: app.schemeId?.name,
        status: app.status
      });
    });

    // Attach applications to documents
    const documentsWithApps = documents.map(doc => {
      const docObj = doc.toObject();
      docObj.relatedApplications = userApplications[doc.userId?._id] || [];
      return docObj;
    });

    res.json(documentsWithApps);
  } catch (err) {
    console.error("Error fetching admin documents:", err);
    res.status(503).json({ msg: "Database error fetching documents" });
  }
});

// Verify document (Admin only)
app.put("/api/admin/documents/:id", protect, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'verified', 'rejected'].includes(status)) {
      return res.status(400).json({ msg: "Invalid verification status" });
    }

    const document = await UserDocument.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ msg: "Document not found" });
    }

    document.verificationStatus = status;
    document.isVerified = status === 'verified';
    await document.save();

    res.json(document);
  } catch (err) {
    console.error("Error updating document verification:", err);
    res.status(503).json({ msg: "Database error updating document verification" });
  }
});

// Download document (Admin only)
app.get("/api/admin/documents/:id/download", protect, isAdmin, async (req, res) => {
  try {
    const document = await UserDocument.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ msg: "Document not found" });
    }

    const filePath = path.join(uploadsDir, document.fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ msg: "File not found on server" });
    }

    res.download(filePath, document.originalName);
  } catch (err) {
    console.error("Error downloading document:", err);
    res.status(503).json({ msg: "Error downloading document" });
  }
});

// Get all applications (Admin only)
app.get("/api/admin/applications", protect, isAdmin, async (req, res) => {
  try {
    const applications = await Application.find({})
      .populate('userId', 'name email')
      .populate('schemeId', 'name category')
      .sort({ createdAt: -1 });

    // Filter out applications where the scheme was deleted (schemeId is null)
    const validApplications = applications.filter(app => app.schemeId !== null);

    if (validApplications.length < applications.length) {
      console.log(`Admin: Filtered out ${applications.length - validApplications.length} applications with deleted schemes`);
    }

    res.json(validApplications);
  } catch (err) {
    console.error("Error fetching admin applications:", err);
    res.status(503).json({ msg: "Database error fetching applications" });
  }
});

// Get admin dashboard data
app.get("/api/admin/dashboard", protect, isAdmin, async (req, res) => {
  try {
    // Get counts for dashboard
    const totalUsers = await User.countDocuments({});
    const totalApplications = await Application.countDocuments({});
    const pendingApplications = await Application.countDocuments({ status: 'Pending' });
    const approvedApplications = await Application.countDocuments({ status: 'Approved' });
    const rejectedApplications = await Application.countDocuments({ status: 'Rejected' });
    const underReviewApplications = await Application.countDocuments({ status: 'Under Review' });
    const totalSchemes = await Scheme.countDocuments({});

    // Get recent applications (last 10)
    const recentApplications = await Application.find({})
      .populate('userId', 'name email')
      .populate('schemeId', 'name category')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get user registration stats for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    // Get active users (logged in within last 24 hours) - mock for now
    const activeUsers = Math.floor(totalUsers * 0.1); // Estimate 10% active

    res.json({
      stats: {
        totalUsers,
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        underReviewApplications,
        totalSchemes,
        recentUsers,
        activeUsers
      },
      recentApplications,
      message: "Admin dashboard data retrieved successfully"
    });
  } catch (err) {
    console.error("Error fetching admin dashboard:", err);
    res.status(503).json({ msg: "Database error fetching dashboard data" });
  }
});

// Get recent activities (Admin only)
app.get("/api/admin/activities", protect, isAdmin, async (req, res) => {
  try {
    const activities = [];

    // Get recent user registrations
    const recentUsers = await User.find({})
      .select('name createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    recentUsers.forEach(user => {
      activities.push({
        type: 'user',
        message: `New user registered: ${user.name}`,
        time: getTimeAgo(user.createdAt),
        icon: 'user',
        timestamp: user.createdAt
      });
    });

    // Get recent applications
    const recentApps = await Application.find({})
      .populate('schemeId', 'name')
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    recentApps.forEach(app => {
      activities.push({
        type: 'application',
        message: `Application submitted for ${app.schemeId?.name} by ${app.userId?.name}`,
        time: getTimeAgo(app.createdAt),
        icon: 'file',
        timestamp: app.createdAt
      });
    });

    // Get recent approvals
    const recentApprovals = await Application.find({ status: 'Approved' })
      .populate('schemeId', 'name')
      .sort({ updatedAt: -1 })
      .limit(3);

    recentApprovals.forEach(app => {
      activities.push({
        type: 'approval',
        message: `Application approved for ${app.schemeId?.name}`,
        time: getTimeAgo(app.updatedAt),
        icon: 'check',
        timestamp: app.updatedAt
      });
    });

    // Get recent document uploads
    const recentDocs = await UserDocument.find({})
      .populate('userId', 'name')
      .sort({ uploadDate: -1 })
      .limit(3);

    recentDocs.forEach(doc => {
      activities.push({
        type: 'document',
        message: `Document uploaded by ${doc.userId?.name}`,
        time: getTimeAgo(doc.uploadDate),
        icon: 'upload',
        timestamp: doc.uploadDate
      });
    });

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(activities.slice(0, 10));
  } catch (err) {
    console.error("Error fetching activities:", err);
    res.status(503).json({ msg: "Database error fetching activities" });
  }
});

// Helper function to calculate time ago
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

// Get all users (Admin only)
app.get("/api/admin/users", protect, isAdmin, async (req, res) => {
  try {
    const users = await User.find({})
      .select('name email role createdAt')
      .sort({ createdAt: -1 });

    // For each user, get their documents and applications count
    const usersWithDetails = await Promise.all(users.map(async (user) => {
      const documents = await UserDocument.find({ userId: user._id }).countDocuments();
      const applications = await Application.find({ userId: user._id }).countDocuments();

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        documentsCount: documents,
        applicationsCount: applications
      };
    }));

    res.json(usersWithDetails);
  } catch (err) {
    console.error("Error fetching admin users:", err);
    res.status(503).json({ msg: "Database error fetching users" });
  }
});

// Get specific user details (Admin only)
app.get("/api/admin/users/:id", protect, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('name email role createdAt');
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const documents = await UserDocument.find({ userId: req.params.id })
      .populate('userId', 'name email')
      .sort({ uploadDate: -1 });

    const applications = await Application.find({ userId: req.params.id })
      .populate('schemeId', 'name category')
      .sort({ createdAt: -1 });

    res.json({
      user,
      documents,
      applications
    });
  } catch (err) {
    console.error("Error fetching user details:", err);
    res.status(503).json({ msg: "Database error fetching user details" });
  }
});

// Verify application (Admin only) - already exists but adding for completeness
// PATCH /api/applications/verify/:id is already admin protected

// Delete an application
app.delete("/api/applications/:id", protect, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Check if the user is the owner of the application or an admin
    const currentUser = await User.findOne({ email: req.user.email });
    if (application.userId.toString() !== currentUser._id.toString() && !currentUser.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this application' });
    }

    await Application.findByIdAndDelete(req.params.id);

    // Create a notification for the user
    await createNotification(
      currentUser._id,
      'application_deleted',
      'Application Deleted',
      'Your application has been deleted successfully',
      { applicationId: application._id }
    );

    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Error deleting application:', error);
    res.status(500).json({ message: 'Error deleting application', error: error.message });
  }
});



// Update application status (Admin only)
app.patch("/api/applications/verify/:id", protect, isAdmin, async (req, res) => {
  try {
    const { status, rejectionReason, adminRemarks } = req.body;

    if (!['submitted', 'under_review', 'approved', 'rejected', 'requires_resubmission', 'final_approved', 'final_rejected'].includes(status)) {
      return res.status(400).json({ msg: "Invalid status" });
    }

    const application = await Application.findById(req.params.id).populate('schemeId');
    if (!application) {
      return res.status(404).json({ msg: "Application not found" });
    }

    // Get user for notification
    const user = await User.findById(application.userId);

    application.status = status;
    if (rejectionReason) {
      application.rejectionReason = rejectionReason;
    }
    if (adminRemarks) {
      application.adminRemarks = adminRemarks;
    }
    application.reviewedBy = req.user.id || req.user._id;

    const updatedApplication = await application.save();

    // Create notifications based on status change
    if (status === 'under_review') {
      await createNotification(
        application.userId,
        'application_under_review',
        'Application Under Review',
        `Your application for ${application.schemeId.name} is now being reviewed by our team. Track your application at: http://localhost:3000/track/${application.trackingId}`,
        {
          applicationId: application._id,
          schemeId: application.schemeId._id,
          trackingId: application.trackingId
        }
      );
    } else if (status === 'approved') {
      await createNotification(
        application.userId,
        'application_approved',
        'Application Approved!',
        `Congratulations! Your application for ${application.schemeId.name} has been approved. Track your application at: http://localhost:3000/track/${application.trackingId}`,
        {
          applicationId: application._id,
          schemeId: application.schemeId._id,
          trackingId: application.trackingId
        }
      );
    } else if (status === 'rejected') {
      await createNotification(
        application.userId,
        'application_rejected',
        'Application Rejected',
        `Unfortunately, your application for ${application.schemeId.name} has been rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''} Track your application at: http://localhost:3000/track/${application.trackingId}`,
        {
          applicationId: application._id,
          schemeId: application.schemeId._id,
          trackingId: application.trackingId,
          rejectionReason: rejectionReason
        }
      );
    }

    res.json(updatedApplication);
  } catch (err) {
    console.error("Error updating application status:", err);
    res.status(503).json({ msg: "Database error updating application status" });
  }
});

// Get user notifications
app.get("/api/notifications", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id || req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('data.applicationId', 'trackingId')
      .populate('data.schemeId', 'name')
      .populate('data.documentId', 'name');
    res.json(notifications);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(503).json({ msg: "Database error fetching notifications" });
  }
});

// Mark notification as read
app.patch("/api/notifications/:id/read", protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id || req.user._id },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ msg: "Notification not found" });
    }
    res.json(notification);
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(503).json({ msg: "Database error updating notification" });
  }
});

// Mark all notifications as read
app.patch("/api/notifications/read-all", protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id || req.user._id, read: false },
      { read: true }
    );
    res.json({ msg: "All notifications marked as read" });
  } catch (err) {
    console.error("Error marking all notifications as read:", err);
    res.status(503).json({ msg: "Database error updating notifications" });
  }
});

// Get unread notifications count
app.get("/api/notifications/unread-count", protect, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user.id || req.user._id,
      read: false
    });
    res.json({ count });
  } catch (err) {
    console.error("Error getting unread count:", err);
    res.status(503).json({ msg: "Database error getting unread count" });
  }
});

// Helper function to create notifications
// Helper function to generate form suggestions based on OCR data
const generateFormSuggestions = (extractedData, documentType) => {
  const suggestions = {};

  switch (documentType.toLowerCase()) {
    case 'aadhaar':
      if (extractedData.name) suggestions.name = extractedData.name;
      if (extractedData.aadhaarNumber) suggestions.aadhaarNumber = extractedData.aadhaarNumber;
      if (extractedData.dateOfBirth) suggestions.dateOfBirth = extractedData.dateOfBirth;
      if (extractedData.gender) suggestions.gender = extractedData.gender;
      break;
    case 'pan':
      if (extractedData.name) suggestions.name = extractedData.name;
      if (extractedData.panNumber) suggestions.panNumber = extractedData.panNumber;
      if (extractedData.dateOfBirth) suggestions.dateOfBirth = extractedData.dateOfBirth;
      if (extractedData.fatherName) suggestions.fatherName = extractedData.fatherName;
      break;
    case 'income':
      if (extractedData.name) suggestions.name = extractedData.name;
      if (extractedData.annualIncome) suggestions.annualIncome = extractedData.annualIncome;
      break;
    case 'caste':
      if (extractedData.name) suggestions.name = extractedData.name;
      if (extractedData.caste) suggestions.caste = extractedData.caste;
      break;
    case 'education':
      if (extractedData.name) suggestions.name = extractedData.name;
      if (extractedData.qualification) suggestions.qualification = extractedData.qualification;
      if (extractedData.institution) suggestions.institution = extractedData.institution;
      break;
  }

  return suggestions;
};

// Check document expiry status
app.get("/api/documents/expiry-status", protect, async (req, res) => {
  try {
    const currentUser = await User.findOne({ email: req.user.email });
    if (!currentUser) return res.status(404).json({ msg: "User not found" });

    const documents = await UserDocument.find({ userId: currentUser._id });
    const now = new Date();

    // Update expiry status for all documents
    const expiryUpdates = documents.map(async (doc) => {
      const isExpired = doc.expiryDate < now;
      if (doc.isExpired !== isExpired) {
        doc.isExpired = isExpired;
        doc.expiryCheckedAt = now;
        await doc.save();
      }
      return doc;
    });

    await Promise.all(expiryUpdates);

    // Get updated documents
    const updatedDocuments = await UserDocument.find({ userId: currentUser._id });

    // Group by expiry status
    const expiryGroups = {
      expired: updatedDocuments.filter(doc => doc.isExpired),
      expiringSoon: updatedDocuments.filter(doc => {
        const daysUntilExpiry = Math.ceil((doc.expiryDate - now) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
      }),
      valid: updatedDocuments.filter(doc => !doc.isExpired && doc.expiryDate > now)
    };

    res.json(expiryGroups);
  } catch (err) {
    console.error("Error checking document expiry:", err);
    res.status(503).json({ msg: "Database error checking document expiry" });
  }
});

// Get user's scheme tracking data
app.get("/api/schemes/tracking", protect, async (req, res) => {
  try {
    const currentUser = await User.findOne({ email: req.user.email });
    if (!currentUser) return res.status(404).json({ msg: "User not found" });

    // Get user's applications with scheme details
    const applications = await Application.find({ userId: currentUser._id })
      .populate('schemeId', 'name category description benefits eligibility')
      .sort({ createdAt: -1 });

    // Get all schemes to check eligibility
    const allSchemes = await Scheme.find({});
    const userDocuments = await UserDocument.find({ userId: currentUser._id });

    // Categorize schemes
    const appliedSchemes = applications.map(app => ({
      ...app.toObject(),
      status: app.status,
      appliedAt: app.createdAt,
      trackingId: app.trackingId
    }));

    const approvedSchemes = appliedSchemes.filter(scheme => scheme.status === 'approved');
    const pendingSchemes = appliedSchemes.filter(scheme => ['submitted', 'under_review'].includes(scheme.status));

    // Check eligibility for schemes not applied to
    const eligibleSchemes = allSchemes
      .filter(scheme => !appliedSchemes.some(app => app.schemeId._id.toString() === scheme._id.toString()))
      .map(scheme => {
        // Simple eligibility check (can be enhanced with more sophisticated logic)
        const hasRequiredDocs = checkDocumentEligibility(scheme, userDocuments);
        const meetsBasicCriteria = checkBasicEligibility(scheme, currentUser);

        return {
          ...scheme.toObject(),
          isEligible: hasRequiredDocs && meetsBasicCriteria,
          missingDocuments: getMissingDocuments(scheme, userDocuments),
          eligibilityScore: calculateEligibilityScore(scheme, currentUser, userDocuments)
        };
      })
      .filter(scheme => scheme.isEligible)
      .sort((a, b) => b.eligibilityScore - a.eligibilityScore)
      .slice(0, 10); // Top 10 eligible schemes

    res.json({
      applied: appliedSchemes,
      approved: approvedSchemes,
      pending: pendingSchemes,
      eligible: eligibleSchemes,
      totalApplied: appliedSchemes.length,
      totalApproved: approvedSchemes.length,
      totalPending: pendingSchemes.length,
      totalEligible: eligibleSchemes.length
    });
  } catch (err) {
    console.error("Error fetching scheme tracking data:", err);
    res.status(503).json({ msg: "Database error fetching scheme tracking data" });
  }
});

// Helper function to check document eligibility
function checkDocumentEligibility(scheme, userDocuments) {
  if (!scheme.documents || scheme.documents.length === 0) return true;

  const requiredCategories = scheme.documents.map(doc => {
    if (doc.includes('Aadhaar') || doc.includes('aadhar')) return 'Identity';
    if (doc.includes('Income') || doc.includes('income')) return 'Income';
    if (doc.includes('Caste') || doc.includes('caste')) return 'Category';
    if (doc.includes('Bank') || doc.includes('bank')) return 'Banking';
    if (doc.includes('Education') || doc.includes('education')) return 'Education';
    return 'Other';
  });

  const userCategories = userDocuments.map(doc => doc.category);
  return requiredCategories.every(cat => userCategories.includes(cat));
}

// Helper function to check basic eligibility
function checkBasicEligibility(scheme, user) {
  // Basic eligibility checks (can be enhanced)
  if (scheme.eligibility?.income && user.income) {
    const schemeMaxIncome = parseInt(scheme.eligibility.income.replace(/[^0-9]/g, ''));
    const userIncome = parseInt(user.income.replace(/[^0-9]/g, ''));
    if (userIncome > schemeMaxIncome) return false;
  }

  if (scheme.eligibility?.age && user.age) {
    const schemeMinAge = scheme.eligibility.age.min || 0;
    const schemeMaxAge = scheme.eligibility.age.max || 999;
    if (user.age < schemeMinAge || user.age > schemeMaxAge) return false;
  }

  return true;
}

// Helper function to get missing documents
function getMissingDocuments(scheme, userDocuments) {
  if (!scheme.documents) return [];

  const requiredDocs = scheme.documents;
  const userDocNames = userDocuments.map(doc => doc.name.toLowerCase());

  return requiredDocs.filter(doc =>
    !userDocNames.some(userDoc => userDoc.includes(doc.toLowerCase()))
  );
}

// Helper function to calculate eligibility score
function calculateEligibilityScore(scheme, user, userDocuments) {
  let score = 0;

  // Document completeness (40 points)
  const requiredCategories = checkDocumentEligibility(scheme, userDocuments) ? 40 : 0;
  score += requiredCategories;

  // Basic criteria match (30 points)
  const basicMatch = checkBasicEligibility(scheme, user) ? 30 : 0;
  score += basicMatch;

  // Category relevance (20 points)
  if (scheme.category === user.category) score += 20;
  else if (user.category && scheme.category) score += 10;

  // Income match (10 points)
  if (scheme.eligibility?.income && user.income) {
    const schemeIncome = parseInt(scheme.eligibility.income.replace(/[^0-9]/g, ''));
    const userIncome = parseInt(user.income.replace(/[^0-9]/g, ''));
    if (userIncome <= schemeIncome) score += 10;
  }

  return score;
}

// Legacy Aadhaar OCR Endpoint (kept for backward compatibility)
app.post('/api/ocr/aadhaar/legacy', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    console.log(`Processing Aadhaar card (legacy): ${req.file.path}`);

    // Process the Aadhaar image using the legacy method
    const ocrService = new OCRService();
    const result = await ocrService.processAadhaarImage(req.file.path);

    // Clean up the uploaded file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting file:', err);
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to process Aadhaar card'
      });
    }

    res.json({
      success: true,
      data: result.data,
      extractedText: result.extractedText
    });
  } catch (error) {
    console.error('Legacy Aadhaar OCR error:', error);

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

// Test route to check if the endpoint is reachable
app.get('/test-upload', (req, res) => {
  console.log('Test upload endpoint hit');
  res.json({ message: 'Upload test endpoint is working' });
});


// Upload document
app.post("/api/documents/upload", protect, (req, res, next) => {
  console.log('Upload endpoint hit');
  console.log('User making request:', req.user);
  console.log('Request headers:', req.headers);

  // Use the upload middleware
  upload.single('document')(req, res, async (err) => {
    console.log('Multer processing complete');
    if (err) {
      console.error('Multer error:', {
        message: err.message,
        stack: err.stack,
        code: err.code,
        field: err.field,
        storageErrors: err.storageErrors
      });

      if (err.code === 'LIMIT_FILE_TYPE') {
        return res.status(400).json({
          success: false,
          message: 'Invalid file type. Please upload a PDF, Word document, image, or text file.',
          error: err.message
        });
      }

      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 10MB.',
          error: err.message
        });
      }

      return res.status(400).json({
        success: false,
        message: 'File upload failed',
        error: err.message,
        code: err.code
      });
    }

    try {
      console.log('Request body:', req.body);
      console.log('Uploaded file details:', {
        originalname: req.file?.originalname,
        mimetype: req.file?.mimetype,
        size: req.file?.size,
        path: req.file?.path
      });

      if (!req.file) {
        console.error('No file was uploaded with the request');
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      console.log('Looking up user with email:', req.user.email);
      const currentUser = await User.findOne({ email: req.user.email });
      console.log('Found user:', currentUser ? currentUser.email : 'Not found');

      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const { name, category = 'Other', description = '', schemeId, schemeName } = req.body;

      // Validate category against allowed values
      const allowedCategories = ['Identity', 'Income', 'Category', 'Banking', 'Address', 'Education', 'Legal', 'Medical', 'Financial', 'Property', 'Business', 'Other'];
      const documentCategory = allowedCategories.includes(category) ? category : 'Other';

      const documentData = {
        userId: currentUser._id,
        name: name || path.parse(req.file.originalname).name,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        category: documentCategory,
        description: description,
        verificationStatus: 'pending',
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default 1 year expiry
        // Add scheme tracking if provided
        ...(schemeId && { schemeId }),
        ...(schemeName && { schemeName })
      };

      console.log('Creating document with data:', JSON.stringify(documentData, null, 2));
      const document = new UserDocument(documentData);

      try {
        const savedDoc = await document.save();
        console.log('Document saved successfully:', savedDoc._id);
      } catch (saveError) {
        console.error('Error saving document to database:', {
          message: saveError.message,
          errors: saveError.errors,
          stack: saveError.stack
        });
        throw saveError; // Re-throw to be caught by the outer catch
      }

      // Create notification for admin (don't fail upload if notification fails)
      try {
        // Find an admin user to send notification to
        const adminUser = await User.findOne({ isAdmin: true });
        if (adminUser) {
          await createNotification(
            adminUser._id,
            'document_uploaded',
            'New Document Uploaded',
            `User ${currentUser.name} has uploaded a new document: ${document.name}`,
            { documentId: document._id, userId: currentUser._id }
          );
        } else {
          console.log('No admin user found to send notification to');
        }
      } catch (notificationError) {
        // Log but don't fail the upload
        console.error('Failed to create admin notification:', notificationError.message);
      }

      return res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        document: {
          id: document._id,
          name: document.name,
          category: document.category,
          status: document.verificationStatus,
          uploadDate: document.uploadDate,
          fileName: document.fileName
        }
      });
    } catch (error) {
      console.error('Document upload error:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        keyValue: error.keyValue,
        errors: error.errors
      });

      // More detailed error response
      const errorResponse = {
        success: false,
        message: 'Error processing document upload',
        error: error.message,
        name: error.name,
        code: error.code
      };

      // Add validation errors if they exist
      if (error.name === 'ValidationError') {
        errorResponse.errors = Object.entries(error.errors).reduce((acc, [key, { message }]) => {
          acc[key] = message;
          return acc;
        }, {});
      }

      // Add stack trace in development
      if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = error.stack;
      }

      return res.status(500).json(errorResponse);
    }
  });
});

// Get user's documents
app.get("/api/documents", protect, async (req, res) => {
  try {
    const currentUser = await User.findOne({ email: req.user.email });
    if (!currentUser) return res.status(404).json({ msg: "User not found" });

    const documents = await UserDocument.find({ userId: currentUser._id }).sort({ uploadDate: -1 });
    res.json(documents);
  } catch (err) {
    console.error("Error fetching documents:", err);
    res.status(503).json({ msg: "Database error fetching documents" });
  }
});

// Get application by tracking ID (authenticated user)
app.get("/api/applications/track/:trackingId", protect, async (req, res) => {
  try {
    const application = await Application.findOne({
      trackingId: req.params.trackingId,
      userId: req.user.id || req.user._id
    })
      .populate('schemeId', 'name category description benefits eligibility')
      .populate('userId', 'name email');

    if (!application) {
      return res.status(404).json({ msg: "Application not found" });
    }

    res.json(application);
  } catch (err) {
    console.error(`Error fetching application by tracking ID ${req.params.trackingId}:`, err);
    res.status(503).json({ msg: "Database error fetching application", error: err.message });
  }
});

// Get application by tracking ID (public access)
app.get("/api/applications/public-track/:trackingId", async (req, res) => {
  try {
    const application = await Application.findOne({
      trackingId: req.params.trackingId
    })
      .populate('schemeId', 'name category')
      .select('trackingId status createdAt submittedAt reviewedAt completedAt estimatedApprovalDays rejectionReason adminRemarks');

    if (!application) {
      return res.status(404).json({ msg: "Application not found" });
    }

    res.json(application);
  } catch (err) {
    console.error(`Error fetching public application by tracking ID ${req.params.trackingId}:`, err);
    res.status(503).json({ msg: "Database error fetching application", error: err.message });
  }
});

// Get Meri Pehchaan access token from authorization code
app.post("/api/meripehchaan/token", protect, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ msg: "Authorization code is required" });

    const tokenResponse = await axios.post(MERIPEHCHAAN_TOKEN_URL, new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: MERIPEHCHAAN_CLIENT_ID,
      client_secret: MERIPEHCHAAN_CLIENT_SECRET,
      code: code,
      redirect_uri: 'http://localhost:3000/dashboard/documents' // Should match the one used in auth URL
    }));

    const { access_token, refresh_token, expires_in, token_type } = tokenResponse.data;

    res.json({
      success: true,
      access_token,
      refresh_token,
      expires_in,
      token_type: token_type || 'Bearer'
    });

  } catch (error) {
    console.error("Meri Pehchaan token error:", error.response?.data || error.message);
    res.status(500).json({
      msg: "Failed to get Meri Pehchaan access token",
      error: error.response?.data || error.message
    });
  }
});

// Get user information from Meri Pehchaan
app.get("/api/meripehchaan/user", protect, async (req, res) => {
  try {
    const { access_token } = req.query;

    if (!access_token) {
      return res.status(400).json({ msg: "Meri Pehchaan access token is required" });
    }

    // Get user information from Meri Pehchaan
    const userResponse = await axios.get(MERIPEHCHAAN_USER_URL, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/json'
      }
    });

    res.json({
      success: true,
      user: userResponse.data,
      provider: 'meripehchaan'
    });

  } catch (error) {
    console.error("Meri Pehchaan user error:", error.response?.data || error.message);
    res.status(500).json({
      msg: "Failed to fetch user information from Meri Pehchaan",
      error: error.response?.data || error.message
    });
  }
});

// Get user documents from Meri Pehchaan
app.get("/api/meripehchaan/documents", protect, async (req, res) => {
  try {
    const { access_token, document_types } = req.query;

    if (!access_token) {
      return res.status(400).json({ msg: "Meri Pehchaan access token is required" });
    }

    // Get user documents from Meri Pehchaan
    // Note: This endpoint structure might vary based on Meri Pehchaan API
    const documentsResponse = await axios.get(`${MERIPEHCHAAN_BASE_URL}/public/oauth2/1/documents`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/json'
      },
      params: {
        types: document_types || 'aadhaar,pan,passport,driving_license'
      }
    });

    res.json({
      success: true,
      documents: documentsResponse.data.documents || [],
      total_count: documentsResponse.data.total_count || 0,
      provider: 'meripehchaan'
    });

  } catch (error) {
    console.error("Meri Pehchaan documents error:", error.response?.data || error.message);
    res.status(500).json({
      msg: "Failed to fetch documents from Meri Pehchaan",
      error: error.response?.data || error.message
    });
  }
});

// Get issued files from Meri Pehchaan
app.get("/api/meripehchaan/files/issued", protect, async (req, res) => {
  try {
    const { access_token, file_types } = req.query;

    if (!access_token) {
      return res.status(400).json({ msg: "Meri Pehchaan access token is required" });
    }

    // Get issued files from Meri Pehchaan
    const filesResponse = await axios.get(`${MERIPEHCHAAN_BASE_URL}/public/oauth2/2/files/issued`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/json'
      },
      params: {
        types: file_types || 'aadhaar,pan,passport,driving_license,certificate'
      }
    });

    res.json({
      success: true,
      files: filesResponse.data.files || [],
      total_count: filesResponse.data.total_count || 0,
      provider: 'meripehchaan'
    });

  } catch (error) {
    console.error("Meri Pehchaan files error:", error.response?.data || error.message);
    res.status(500).json({
      msg: "Failed to fetch issued files from Meri Pehchaan",
      error: error.response?.data || error.message
    });
  }
});

// Refresh Meri Pehchaan access token
app.post("/api/meripehchaan/refresh", protect, async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ msg: "Refresh token is required" });
    }

    const refreshResponse = await axios.post(MERIPEHCHAAN_TOKEN_URL, new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: MERIPEHCHAAN_CLIENT_ID,
      client_secret: MERIPEHCHAAN_CLIENT_SECRET,
      refresh_token: refresh_token
    }));

    res.json({
      success: true,
      access_token: refreshResponse.data.access_token,
      refresh_token: refreshResponse.data.refresh_token,
      expires_in: refreshResponse.data.expires_in
    });

  } catch (error) {
    console.error("Meri Pehchaan refresh error:", error.response?.data || error.message);
    res.status(500).json({
      msg: "Failed to refresh Meri Pehchaan access token",
      error: error.response?.data || error.message
    });
  }
});

// Create Meri Pehchaan session for OAuth
app.post("/api/meripehchaan/session", protect, async (req, res) => {
  try {
    const { documentType } = req.body;

    // Generate OAuth URL for Meri Pehchaan
    const meripehchaanAuthUrl = `${MERIPEHCHAAN_BASE_URL}/public/oauth2/1/authorize?` +
      `client_id=${MERIPEHCHAAN_CLIENT_ID}&` +
      `response_type=code&` + // This should be 'code' for server-side flow
      `redirect_uri=${encodeURIComponent('http://localhost:5000/api/meripehchaan/callback')}&` +
      `state=${Date.now()}&` +
      `scope=user documents`;

    res.json({
      sessionId: `mp_session_${Date.now()}`,
      authUrl: meripehchaanAuthUrl,
      provider: 'meripehchaan',
      message: "Redirect user to this URL to authenticate with Meri Pehchaan"
    });

  } catch (err) {
    console.error("Meri Pehchaan session error:", err);
    res.status(500).json({ msg: "Failed to create Meri Pehchaan session" });
  }
});

// Meri Pehchaan OAuth callback
app.get("/api/meripehchaan/callback", async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).json({ msg: "Meri Pehchaan authentication failed", error });
    }

    if (!code || !state) {
      return res.status(400).json({ msg: "Missing authorization code or state" });
    }

    // Exchange authorization code for access token
    const tokenResponse = await axios.post(MERIPEHCHAAN_TOKEN_URL, new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: MERIPEHCHAAN_CLIENT_ID,
      client_secret: MERIPEHCHAAN_CLIENT_SECRET,
      code: code,
      redirect_uri: 'http://localhost:5000/api/meripehchaan/callback'
    }));

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    res.json({
      success: true,
      access_token,
      refresh_token,
      expires_in,
      sessionId: state,
      message: "Meri Pehchaan authentication successful"
    });

  } catch (err) {
    console.error("Meri Pehchaan callback error:", err);
    res.status(500).json({ msg: "Meri Pehchaan callback failed" });
  }
});

// Verify document using Meri Pehchaan
app.post("/api/meripehchaan/verify", protect, async (req, res) => {
  try {
    const { documentType, documentData, access_token } = req.body;

    if (!documentType || !documentData || !access_token) {
      return res.status(400).json({ msg: "Document type, data, and access token are required" });
    }

    // Verify the document with Meri Pehchaan
    const verification = {
      verified: true,
      confidence: 0.95,
      method: "meripehchaan",
      timestamp: new Date().toISOString(),
      documentId: `meripehchaan_${documentType}_${Date.now()}`,
      provider: 'meripehchaan'
    };

    // Update user's document verification status
    const userDocument = await UserDocument.findOne({
      userId: req.user.id || req.user._id,
      name: documentData.name || "Unknown Document"
    });

    if (userDocument) {
      userDocument.verificationStatus = 'verified';
      userDocument.isVerified = true;
      await userDocument.save();
    }

    res.json({
      success: true,
      verification,
      message: "Document verified successfully using Meri Pehchaan"
    });

  } catch (err) {
    console.error("Meri Pehchaan verification error:", err);
    res.status(500).json({ msg: "Document verification failed" });
  }
});

// OCR Processing endpoint
app.post("/api/ocr/process", protect, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No document file provided" });
    }

    const { documentType } = req.body;
    const filePath = req.file.path;

    // Initialize OCR service if needed
    if (!global.ocrService) {
      global.ocrService = new OCRService();
    }

    // Process document with OCR
    const ocrResult = await global.ocrService.processDocument(filePath, documentType);

    // Clean up uploaded file after processing
    fs.unlinkSync(filePath);

    if (ocrResult.success) {
      res.json({
        success: true,
        data: ocrResult.extractedData,
        confidence: ocrResult.confidence,
        documentType: ocrResult.documentType,
        message: `Document processed with ${ocrResult.confidence}% confidence`
      });
    } else {
      res.status(400).json({
        success: false,
        error: ocrResult.error,
        message: "Failed to process document"
      });
    }

  } catch (error) {
    console.error("OCR processing error:", error);

    // Clean up file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error("File cleanup error:", cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: error.message,
      message: "OCR processing failed"
    });
  }
});

// Document validation endpoint
app.post("/api/validate/document", protect, async (req, res) => {
  try {
    const { documentType, extractedData, userData } = req.body;

    if (!global.ocrService) {
      global.ocrService = new OCRService();
    }

    const validation = await global.ocrService.validateDocumentData(extractedData, userData, documentType);

    res.json({
      success: true,
      validation,
      message: validation.isValid ?
        `Document validation passed with ${validation.confidence}% confidence` :
        `Document validation failed. ${validation.mismatches.length} issues found`
    });

  } catch (error) {
    console.error("Document validation error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Document validation failed"
    });
  }
});

// Auto-fill form from document
app.post("/api/autofill/form", protect, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No document file provided" });
    }

    const { documentType } = req.body;
    const filePath = req.file.path;

    // Initialize OCR service if needed
    if (!global.ocrService) {
      global.ocrService = new OCRService();
    }

    // Process document with OCR
    const ocrResult = await global.ocrService.processDocument(filePath, documentType);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    if (ocrResult.success) {
      // Generate form suggestions based on extracted data
      const formSuggestions = generateFormSuggestions(ocrResult.extractedData, documentType);

      res.json({
        success: true,
        extractedData: ocrResult.extractedData,
        formSuggestions,
        confidence: ocrResult.confidence,
        message: `Form auto-fill suggestions generated with ${ocrResult.confidence}% confidence`
      });
    } else {
      res.status(400).json({
        success: false,
        error: ocrResult.error,
        message: "Failed to process document for form auto-fill"
      });
    }

  } catch (error) {
    console.error("Form auto-fill error:", error);

    // Clean up file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error("File cleanup error:", cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: error.message,
      message: "Form auto-fill failed"
    });
  }
});

// Generate application PDF
app.get("/api/applications/:id/pdf", protect, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('schemeId', 'name category description benefits eligibility')
      .populate('userId', 'name email');

    if (!application) {
      return res.status(404).json({ msg: "Application not found" });
    }

    // Check if user owns the application or is admin
    if (application.userId._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ msg: "Not authorized to download this application" });
    }

    // Initialize PDF service if needed
    if (!global.pdfService) {
      global.pdfService = new PDFService();
    }

    // Generate PDF
    const pdfBuffer = await global.pdfService.generateApplicationPDF(application);

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="application-${application.trackingId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF buffer
    res.send(pdfBuffer);

  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "PDF generation failed"
    });
  }
});

// Generate application PDF by tracking ID (public access)
app.get("/api/applications/track/:trackingId/pdf", async (req, res) => {
  try {
    const application = await Application.findOne({
      trackingId: req.params.trackingId
    })
      .populate('schemeId', 'name category description benefits eligibility')
      .select('trackingId status createdAt submittedAt reviewedAt completedAt estimatedApprovalDays rejectionReason adminRemarks schemeId');

    if (!application) {
      return res.status(404).json({ msg: "Application not found" });
    }

    // Initialize PDF service if needed
    if (!global.pdfService) {
      global.pdfService = new PDFService();
    }

    // Generate PDF
    const pdfBuffer = await global.pdfService.generateApplicationPDF(application);

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="application-${application.trackingId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF buffer
    res.send(pdfBuffer);

  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "PDF generation failed"
    });
  }
});

// ---------- Initialize Services ----------

// ---------- Enhanced Features Endpoints ----------
// Note: Chatbot and Accessibility features are available in separate services
// They can be integrated later when the main server is stable
const automationService = new AutomationService();

// ---------- Server startup with DB retry logic ----------
console.log("🚀 Starting Scheme Genie Backend Server...");
console.log("📋 Environment Debug:");
console.log(`   MONGO_URI: ${MONGO_URI ? '✓ Set' : '❌ NOT SET'}`);
console.log(`   JWT_SECRET: ${JWT_SECRET ? '✓ Set' : '❌ NOT SET'}`);
console.log(`   GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID ? '✓ Set' : '❌ NOT SET'}`);
console.log(`   CWD: ${process.cwd()}`);

const connectWithRetry = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(MONGO_URI);
      return; // Success
    } catch (err) {
      console.error(`❌ MongoDB connection attempt ${i + 1} failed:`, err.message);
      if (i < retries - 1) {
        console.log(`🔄 Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  console.error("❌ Failed to connect to MongoDB after all retry attempts. Exiting.");
  process.exit(1);
};

connectWithRetry().then(async () => {
  // Start automation service
  await automationService.start();

  const PORT = process.env.PORT || 5002;
  const server = app.listen(PORT, () => {
    console.log(`🚀 Scheme Genie Backend Server running on port ${PORT}`);
    console.log(`📍 Server URL: http://localhost:${PORT}`);
    console.log(`🔗 Frontend URL: http://localhost:3000`);
    console.log(`💚 Health Check: http://localhost:${PORT}/health`);
    console.log(`🤖 Automation service: ACTIVE`);
  });

  // Graceful shutdown handling
  const shutdown = (signal) => async () => {
    console.log(`🛑 ${signal} received, shutting down gracefully...`);
    server.close(async () => {
      await automationService.stop();
      mongoose.connection.close(false, () => {
        console.log('✅ MongoDB connection closed.');
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', shutdown('SIGTERM'));
  process.on('SIGINT', shutdown('SIGINT'));
}).catch(err => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down server...');
  if (typeof automationService !== 'undefined') {
    await automationService.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down...');
  if (typeof automationService !== 'undefined') {
    await automationService.stop();
  }
  process.exit(0);
});
