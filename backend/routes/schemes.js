import dotenv from 'dotenv';
import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();

const router = express.Router();
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'scheme-genie';
const SCHEMES_COLLECTION = 'schemes';

// Helper function to build filter from query parameters
const buildFilter = (query) => {
  const filter = {};
  const {
    category,
    search,
    minAge,
    maxAge,
    income,
    caste,
    gender,
    state,
    sortBy = 'name',
    sortOrder = 'asc'
  } = query;

  // Text search
  if (search) {
    filter.$text = { $search: search };
  }

  // Category filter
  if (category) {
    filter.category = category;
  }

  // Age range filter
  if (minAge || maxAge) {
    filter.$and = filter.$and || [];
    if (minAge) {
      filter.$and.push({
        $or: [
          { 'eligibility.minAge': { $lte: parseInt(minAge) } },
          { 'eligibility.minAge': { $exists: false } }
        ]
      });
    }
    if (maxAge) {
      filter.$and.push({
        $or: [
          { 'eligibility.maxAge': { $gte: parseInt(maxAge) } },
          { 'eligibility.maxAge': { $exists: false } }
        ]
      });
    }
  }

  // Income filter
  if (income) {
    filter['eligibility.income'] = income;
  }

  // Caste filter
  if (caste) {
    const castes = Array.isArray(caste) ? caste : [caste];
    filter['eligibility.caste'] = { $in: castes };
  }

  // Gender filter
  if (gender && gender !== 'All') {
    filter['eligibility.gender'] = { $in: [gender, 'All'] };
  }

  // State filter
  if (state) {
    const states = Array.isArray(state) ? state : [state];
    filter['eligibility.state'] = { $in: states };
  }

  // Only active schemes
  filter.isActive = true;

  return { filter, sortBy, sortOrder };
};

import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) : null;

// Helper to translate schemes
const translateSchemes = async (schemes, targetLanguage) => {
  if (!model || !targetLanguage || targetLanguage === 'en') return schemes;

  try {
    // Prepare simplified objects for translation to save tokens
    const schemesToTranslate = schemes.map(s => ({
      _id: s._id,
      name: s.name,
      description: s.description,
      benefits: s.benefits, // Assuming this is an array or string
      eligibility: s.eligibility // Object
    }));

    const prompt = `
      Translate the following JSON array of government schemes to ${targetLanguage}.
      Return ONLY the valid JSON array.
      Do NOT translate keys (like '_id', 'name', 'description', 'benefits', 'eligibility').
      Translate the VALUES of 'name', 'description', 'benefits', and 'eligibility' content.
      Keep the structure exactly the same.
      
      JSON:
      ${JSON.stringify(schemesToTranslate)}
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Extract JSON from markdown code block if present
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : text;

    const translatedSchemes = JSON.parse(jsonStr);

    // Merge translated data back into original schemes
    return schemes.map(original => {
      const translated = translatedSchemes.find(t => t._id === original._id.toString() || t._id === original._id);
      if (translated) {
        return {
          ...original,
          name: translated.name,
          description: translated.description,
          benefits: translated.benefits,
          eligibility: translated.eligibility
        };
      }
      return original;
    });

  } catch (error) {
    console.error('Translation error:', error);
    return schemes; // Fallback to original
  }
};

// Get all schemes with filtering and pagination
router.get('/', async (req, res) => {
  let client;
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const language = req.query.language || 'en';

    const { filter, sortBy, sortOrder } = buildFilter(req.query);
    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    client = new MongoClient(MONGO_URI);
    await client.connect();
    const database = client.db(DB_NAME);

    const [schemes, total] = await Promise.all([
      database
        .collection(SCHEMES_COLLECTION)
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .toArray(),
      database.collection(SCHEMES_COLLECTION).countDocuments(filter)
    ]);

    // Translate schemes if language is not English
    let finalSchemes = schemes;
    if (language !== 'en' && schemes.length > 0) {
      console.log(`Translating ${schemes.length} schemes to ${language}...`);
      finalSchemes = await translateSchemes(schemes, language);
    }

    res.json({
      data: finalSchemes,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching schemes:', error);
    res.status(500).json({
      error: 'Failed to fetch schemes',
      details: error.message
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// Get scheme by ID
router.get('/:id', async (req, res) => {
  let client;
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid scheme ID' });
    }

    client = new MongoClient(MONGO_URI);
    await client.connect();
    const database = client.db(DB_NAME);

    const scheme = await database
      .collection(SCHEMES_COLLECTION)
      .findOne({ _id: new ObjectId(id) });

    if (!scheme) {
      return res.status(404).json({ error: 'Scheme not found' });
    }

    res.json(scheme);
  } catch (error) {
    console.error('Error fetching scheme:', error);
    res.status(500).json({
      error: 'Failed to fetch scheme',
      details: error.message
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// Get all unique categories
router.get('/categories', async (req, res) => {
  let client;
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    const database = client.db(DB_NAME);

    const categories = await database
      .collection(SCHEMES_COLLECTION)
      .distinct('category', { isActive: true });

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      error: 'Failed to fetch categories',
      details: error.message
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

export default router;
