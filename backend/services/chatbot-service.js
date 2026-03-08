#!/usr/bin/env node

/**
 * Interactive Chatbot Service with Form Auto-Fill
 * Handles conversational form filling and AI-powered document processing
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";
import Scheme from "./models/scheme.js";

class ChatbotService {
  constructor() {
    this.conversationStates = new Map(); // userID -> conversation state
    this.formFields = new Map(); // userID -> form data
    this.ocrService = null; // Initialize lazily
    this.genAI = null; // Initialize lazily
    this.model = null;
  }

  // Get AI Model instance (lazy initialization)
  getAIModel() {
    if (!this.model) {
      const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn("GOOGLE_API_KEY or GEMINI_API_KEY is not set in environment variables.");
        return null;
      }
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    }
    return this.model;
  }

  // Get OCR service instance (lazy initialization)
  getOCRService() {
    if (!this.ocrService) {
      this.ocrService = new OCRService();
    }
    return this.ocrService;
  }

  // Initialize conversation for a user
  initializeConversation(userId) {
    const conversationState = {
      step: 'welcome',
      currentForm: null,
      collectedData: {},
      pendingQuestions: [],
      currentQuestionIndex: 0,
      isFormFilling: false,
      documentProcessing: false
    };

    this.conversationStates.set(userId, conversationState);
    return conversationState;
  }

  // Get or create conversation state for user
  getConversationState(userId) {
    if (!this.conversationStates.has(userId)) {
      return this.initializeConversation(userId);
    }
    return this.conversationStates.get(userId);
  }

  // Process user message and generate response
  async processMessage(userId, message, userData = {}, language = 'en') {
    console.log(`processMessage called with: "${message}"`);
    // Initialize state if not exists
    if (!this.conversationStates.has(userId)) {
      this.initializeConversation(userId);
    }
    
    const state = this.getConversationState(userId);
    const lowerMessage = message.toLowerCase();

    // Global reset commands - allow user to restart at any time
    if (['hi', 'hello', 'hey', 'start', 'restart', 'cancel', 'stop', 'menu'].includes(lowerMessage)) {
      console.log(`Resetting conversation for user ${userId}`);
      try {
        // Reset state
        state.step = 'welcome';
        state.isFormFilling = false;
        state.documentProcessing = false;
        state.currentForm = null;
        state.collectedData = {};
        state.pendingQuestions = [];
        state.currentQuestionIndex = 0;
        
        this.conversationStates.set(userId, state);
        return await this.handleWelcome(userId, message, state, language);
      } catch (error) {
        console.error("Error during conversation reset:", error);
        return {
          type: 'welcome',
          message: `Hello! I am SchemeGenie. How can I help you today? (Debug: Received "${lowerMessage}")`,
          suggestions: ['Find schemes', 'Fill application form', 'Upload documents', 'Help']
        };
      }
    }

    // Force scheme search for specific keywords - bypass state
    if (lowerMessage.includes('find scheme') || lowerMessage.includes('search scheme') || lowerMessage === 'find schemes') {
       console.log("Forcing scheme search flow - Condition MATCHED");
       state.step = 'scheme_search';
       return await this.handleSchemeSearch(userId, message, state, language);
    } else {
       console.log(`Forcing scheme search flow - Condition FAILED for "${lowerMessage}"`);
    }

    // Check if user is in a specific flow

    try {
      // Handle different conversation states
      switch (state.step) {
        case 'welcome':
          return await this.handleWelcome(userId, message, state, language);

        case 'form_filling':
          return await this.handleFormFilling(userId, message, state, language);

        case 'document_processing':
          return await this.handleDocumentProcessing(userId, message, state, language);

        case 'scheme_search':
          return await this.handleSchemeSearch(userId, message, state, language);

        case 'application_assistance':
          return await this.handleApplicationAssistance(userId, message, state, language);

        default:
          return await this.handleGeneralQuery(userId, message, state, "", language);
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      return {
        type: 'error',
        message: 'Sorry, I encountered an error. Please try again.',
        suggestions: ['Start over', 'Help']
      };
    }
  }

  // Welcome conversation - Now uses AI for intelligent responses
  async handleWelcome(userId, message, state, language = 'en') {
    const lowerMessage = message.toLowerCase();
    console.log(`handleWelcome received: "${message}" (lower: "${lowerMessage}")`);

    // Check for specific action triggers
    if (lowerMessage.includes('fill') && (lowerMessage.includes('form') || lowerMessage.includes('apply'))) {
      state.step = 'form_filling';
      state.isFormFilling = true;
      state.pendingQuestions = this.getInitialQuestions();
      state.currentQuestionIndex = 0;

      return {
        type: 'form_start',
        message: 'Great! I\'ll help you fill out a scheme application form. Let\'s start with some basic information.\n\n' + this.getInitialQuestions()[0].label,
        currentQuestion: this.getInitialQuestions()[0],
        formData: {}
      };
    }

    if (lowerMessage.includes('document') || lowerMessage.includes('upload') || lowerMessage.includes('scan')) {
      state.step = 'document_processing';
      state.documentProcessing = true;

      return {
        type: 'document_guide',
        message: 'I can help you with documents! To upload your documents:\n\n1. Click on "📄 Documents" in the navigation menu at the top\n2. You can upload Aadhaar, PAN, Income Certificate, and more\n3. Our system will help auto-fill forms using your documents\n\nWould you like me to guide you there?',
        supportedDocuments: ['Aadhaar Card', 'PAN Card', 'Income Certificate', 'Caste Certificate', 'Education Certificate'],
        suggestions: ['Show me how', 'Go to Documents page', 'Back to main menu'],
        navigateTo: '/documents'
      };
    }

    // Check if user is asking about a specific scheme category
    const categoryKeywords = {
      'education': ['education', 'student', 'scholarship', 'school', 'college', 'study'],
      'healthcare': ['health', 'medical', 'hospital', 'insurance', 'ayushman'],
      'housing': ['housing', 'home', 'house', 'pmay', 'awas'],
      'employment': ['employment', 'job', 'skill', 'training', 'work', 'pmkvy'],
      'agriculture': ['agriculture', 'farmer', 'farming', 'kisan', 'crop'],
      'financial': ['financial', 'money', 'loan', 'subsidy', 'benefit']
    };

    let hasSpecificCategory = false;
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        hasSpecificCategory = true;
        break;
      }
    }

    const isSchemeSearch = hasSpecificCategory || 
                           ((lowerMessage.includes('search') || lowerMessage.includes('find') || lowerMessage.includes('show') || lowerMessage.includes('get')) && lowerMessage.includes('scheme')) ||
                           lowerMessage.trim() === 'find schemes';
    console.log(`Checking scheme search condition: hasSpecificCategory=${hasSpecificCategory}, isSchemeSearch=${isSchemeSearch}`);

    // Only trigger scheme search if there's a specific category mentioned
    if (isSchemeSearch) {
      state.step = 'scheme_search';
      return await this.handleSchemeSearch(userId, message, state, language);
    }

    // Use AI for all other queries - Modern conversational approach
    const model = this.getAIModel();

    if (!model) {
      // Fallback if no API key
      return {
        type: 'welcome',
        message: 'Hello! I\'m Scheme Genie 🤖\n\nI can help you with:\n• Finding government schemes\n• Filling application forms\n• Processing documents\n• Application guidance\n\nWhat would you like to do?',
        suggestions: ['Find schemes', 'Fill form', 'Upload document', 'Help me apply']
      };
    }

    try {
      // Get scheme statistics for better responses
      let totalSchemes = 0;
      let categoryBreakdown = {};
      
      try {
        const allSchemes = await Scheme.find({ isActive: true });
        totalSchemes = allSchemes.length;
        
        // Count schemes by category
        const categories = ['education', 'healthcare', 'housing', 'employment', 'agriculture', 'financial'];
        for (const cat of categories) {
          const count = allSchemes.filter(s => 
            s.category && s.category.toLowerCase().includes(cat)
          ).length;
          if (count > 0) {
            categoryBreakdown[cat] = count;
          }
        }
      } catch (err) {
        console.error("Error fetching scheme stats:", err);
      }

      const categoryStats = Object.entries(categoryBreakdown)
        .map(([cat, count]) => `${cat.charAt(0).toUpperCase() + cat.slice(1)}: ${count} schemes`)
        .join(', ');

      const prompt = `You are Scheme Genie, a friendly and helpful AI assistant for SchemeSeva - India's premier government scheme discovery platform.

Your personality:
- Warm, encouraging, and supportive
- Expert in Indian government schemes
- Conversational and modern (use emojis occasionally)
- Concise but informative

User message: "${message}"
Language: ${language}

Context: This is a conversation about government schemes in India. The user can:
1. Search for schemes by category (education, healthcare, housing, employment, agriculture, financial)
2. Fill application forms with your help
3. Upload documents for auto-fill
4. Get guidance on eligibility and application process

Available Schemes Statistics:
- Total active schemes: ${totalSchemes}
- Category breakdown: ${categoryStats || 'Loading...'}

Special Instructions:
- If the user asks generically about "schemes" or "finding schemes", provide an enthusiastic response
- Mention the total number of schemes available (${totalSchemes})
- Show the category breakdown in a friendly way
- Encourage them to either:
  1. Browse all schemes
  2. Tell you what type of schemes they need (education, healthcare, housing, employment, agriculture, financial)
  3. Share their profile details for personalized recommendations
- Be encouraging and make them excited about discovering schemes
- Use emojis to make it engaging (🎯, 📚, 🏥, 🏠, 💼, 🌾, 💰)

Task: Provide a helpful, enthusiastic response in ${language}. Keep it conversational and under 150 words. Make them feel excited about finding the right schemes!`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      // Generate contextual suggestions based on the query
      const suggestions = this.generateSmartSuggestions(lowerMessage);

      return {
        type: 'text',
        message: response,
        suggestions: suggestions
      };
    } catch (error) {
      console.error("AI Error:", error);
      return {
        type: 'welcome',
        message: `Hello! I'm Scheme Genie. I can help you find government schemes, fill forms, and guide you through applications. What would you like to know? (Debug: Received "${lowerMessage}")`,
        suggestions: ['Find schemes', 'Fill application form', 'Upload documents', 'Help']
      };
    }
  }

  // Generate smart suggestions based on user query
  generateSmartSuggestions(query) {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('education') || lowerQuery.includes('student') || lowerQuery.includes('scholarship')) {
      return ['📚 Education schemes', 'Scholarship programs', 'Student benefits', 'Check eligibility'];
    }

    if (lowerQuery.includes('health') || lowerQuery.includes('medical') || lowerQuery.includes('insurance')) {
      return ['🏥 Healthcare schemes', 'Ayushman Bharat', 'Medical insurance', 'Health benefits'];
    }

    if (lowerQuery.includes('housing') || lowerQuery.includes('home') || lowerQuery.includes('pmay')) {
      return ['🏠 Housing schemes', 'PM Awas Yojana', 'Home loans', 'Check eligibility'];
    }

    if (lowerQuery.includes('employment') || lowerQuery.includes('job') || lowerQuery.includes('skill')) {
      return ['💼 Employment schemes', 'Skill training', 'PMKVY', 'Job opportunities'];
    }

    if (lowerQuery.includes('farmer') || lowerQuery.includes('agriculture') || lowerQuery.includes('kisan')) {
      return ['🌾 Agriculture schemes', 'PM-KISAN', 'Farmer benefits', 'Crop insurance'];
    }

    if (lowerQuery.includes('benefit') || lowerQuery.includes('money') || lowerQuery.includes('financial')) {
      return ['💰 Financial schemes', 'Direct benefits', 'Subsidies', 'Loan schemes'];
    }

    if (lowerQuery.includes('document') || lowerQuery.includes('upload') || lowerQuery.includes('aadhaar')) {
      return ['Upload documents', 'Aadhaar OCR', 'Auto-fill forms', 'Document guide'];
    }

    // Default suggestions
    return ['Find schemes', 'Fill application form', 'Upload documents', 'Help'];
  }

  // Form filling conversation
  async handleFormFilling(userId, message, state) {
    const currentQuestion = state.pendingQuestions[state.currentQuestionIndex];

    if (!currentQuestion) {
      // No more questions, process the form
      return await this.processCompletedForm(userId, state);
    }

    // Validate and store the answer
    const validation = this.validateAnswer(message, currentQuestion);

    if (!validation.isValid) {
      return {
        type: 'validation_error',
        message: validation.message,
        currentQuestion: currentQuestion,
        suggestions: currentQuestion.suggestions || []
      };
    }

    // Store the answer
    state.collectedData[currentQuestion.field] = validation.value;

    // Move to next question
    state.currentQuestionIndex++;

    if (state.currentQuestionIndex < state.pendingQuestions.length) {
      const nextQuestion = state.pendingQuestions[state.currentQuestionIndex];
      return {
        type: 'next_question',
        message: `Great! ${currentQuestion.label}: ${validation.value}`,
        currentQuestion: nextQuestion,
        progress: Math.round((state.currentQuestionIndex / state.pendingQuestions.length) * 100),
        formData: state.collectedData
      };
    } else {
      // All questions answered
      return await this.processCompletedForm(userId, state);
    }
  }

  // Document processing conversation
  async handleDocumentProcessing(userId, message, state) {
    // This would integrate with the OCR service
    // For now, return a mock response
    return {
      type: 'document_processing',
      message: 'Document processing functionality will be integrated with the OCR service. Please upload a document to extract information.',
      suggestions: ['Upload Aadhaar', 'Upload PAN', 'Back to main menu']
    };
  }

  // Handle scheme search using AI - Enhanced with smart filtering
  async handleSchemeSearch(userId, message, state, language = 'en') {
    const lowerMessage = message.toLowerCase();

    // Detect category from message
    let category = null;
    const categoryKeywords = {
      'education': ['education', 'student', 'scholarship', 'school', 'college', 'study'],
      'healthcare': ['health', 'medical', 'hospital', 'insurance', 'ayushman'],
      'housing': ['housing', 'home', 'house', 'pmay', 'awas'],
      'employment': ['employment', 'job', 'skill', 'training', 'work', 'pmkvy'],
      'agriculture': ['agriculture', 'farmer', 'farming', 'kisan', 'crop'],
      'financial': ['financial', 'money', 'loan', 'subsidy', 'benefit']
    };

    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        category = cat;
        break;
      }
    }

    try {
      // Get scheme count for the category
      let schemeCount = 0;
      let categoryName = category || 'government';

      if (category) {
        const schemes = await Scheme.find({
          isActive: true,
          category: { $regex: category, $options: 'i' }
        });
        schemeCount = schemes.length;
      } else {
        const schemes = await Scheme.find({ isActive: true });
        schemeCount = schemes.length;
      }

      // Store the category in state for follow-up
      state.searchCategory = category;
      state.step = 'collecting_profile';

      const categoryDisplay = category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Government';

      return {
        type: 'scheme_search_start',
        message: `Great! 🎯 I found **${schemeCount} ${categoryDisplay} schemes** available.\n\nTo recommend the best schemes for you, I need some basic information. You can either:\n\n1️⃣ **Import from your profile** (if you've filled it)\n2️⃣ **Provide details manually**\n\nThis will help me filter schemes based on your age, income, state, and other eligibility criteria.`,
        schemeCount: schemeCount,
        category: category,
        actions: [
          {
            type: 'import_profile',
            label: '📋 Import from Profile',
            description: 'Use your saved profile details'
          },
          {
            type: 'manual_input',
            label: '✍️ Manual Input',
            description: 'Provide details now'
          },
          {
            type: 'suggestion',
            label: 'Browse all schemes',
            text: 'Browse all schemes'
          }
        ],
        suggestions: ['Import from Profile', 'Manual Input', 'Browse all schemes']
      };
    } catch (error) {
      console.error("Scheme search error:", error);
      return {
        type: 'text',
        message: "I'm having trouble searching for schemes right now. You can try browsing the schemes list directly.",
        suggestions: ['Browse schemes', 'Back to main menu']
      };
    }
  }

  // Handle application assistance using AI
  async handleApplicationAssistance(userId, message, state) {
    return await this.handleGeneralQuery(userId, message, state, "The user needs help with the application process.");
  }

  // Handle general queries using AI
  async handleGeneralQuery(userId, message, state, context = "", language = 'en') {
    const model = this.getAIModel();

    // Fallback if no API key
    if (!model) {
      return {
        type: 'text',
        message: "I'm sorry, I can't process your request right now. Please try using the menu options.",
        suggestions: ['Fill form', 'Upload document', 'Search schemes', 'Help']
      };
    }

    try {
      const prompt = `You are Scheme Genie, a helpful assistant for SchemeSeva, a platform helping Indian citizens find and apply for government schemes.
      ${context}
      User message: "${message}"
      Target Language: ${language}
      
      Provide a helpful, friendly, and concise response in the target language (${language}). 
      If the user asks about specific schemes, summarize them briefly using bullet points (•) for better readability.
      If the user wants to apply, encourage them to use the 'Fill Application Form' feature.
      Do not invent fake schemes. If you don't know, suggest they check the official portal or search on SchemeSeva.
      Keep the response under 150 words unless detailed explanation is requested.`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      return {
        type: 'text',
        message: response,
        suggestions: ['Fill form', 'Search schemes', 'Help']
      };
    } catch (error) {
      console.error("AI Error:", error);
      return {
        type: 'text',
        message: "I'm having trouble connecting to my brain right now. Please try again later.",
        suggestions: ['Help', 'Start over']
      };
    }
  }

  // Get initial questions for form filling
  getInitialQuestions() {
    return [
      {
        field: 'name',
        label: 'What is your full name?',
        type: 'text',
        required: true,
        validation: 'name'
      },
      {
        field: 'age',
        label: 'What is your age?',
        type: 'number',
        required: true,
        validation: 'age'
      },
      {
        field: 'gender',
        label: 'What is your gender?',
        type: 'select',
        required: true,
        options: ['Male', 'Female', 'Other'],
        suggestions: ['Male', 'Female', 'Other']
      },
      {
        field: 'category',
        label: 'What is your category/caste?',
        type: 'select',
        required: true,
        options: ['General', 'OBC', 'SC', 'ST'],
        suggestions: ['General', 'OBC', 'SC', 'ST']
      },
      {
        field: 'income',
        label: 'What is your annual income? (in rupees)',
        type: 'number',
        required: true,
        validation: 'income'
      },
      {
        field: 'state',
        label: 'Which state do you live in?',
        type: 'text',
        required: true,
        validation: 'state'
      },
      {
        field: 'education',
        label: 'What is your highest education level?',
        type: 'select',
        required: true,
        options: ['Below 10th', '10th Pass', '12th Pass', 'Graduate', 'Post Graduate', 'PhD'],
        suggestions: ['Below 10th', '10th Pass', '12th Pass', 'Graduate', 'Post Graduate']
      },
      {
        field: 'employment',
        label: 'What is your employment status?',
        type: 'select',
        required: true,
        options: ['Unemployed', 'Student', 'Employed', 'Self-employed', 'Retired'],
        suggestions: ['Unemployed', 'Student', 'Employed', 'Self-employed', 'Retired']
      }
    ];
  }

  // Validate user answer
  validateAnswer(answer, question) {
    switch (question.validation) {
      case 'name':
        if (answer.length < 2) {
          return { isValid: false, message: 'Please enter a valid name (at least 2 characters)' };
        }
        return { isValid: true, value: answer.trim() };

      case 'age':
        const age = parseInt(answer);
        if (isNaN(age) || age < 0 || age > 120) {
          return { isValid: false, message: 'Please enter a valid age (0-120)' };
        }
        return { isValid: true, value: age };

      case 'income':
        const income = parseInt(answer.replace(/[,\s]/g, ''));
        if (isNaN(income) || income < 0) {
          return { isValid: false, message: 'Please enter a valid income amount' };
        }
        return { isValid: true, value: income };

      case 'state':
        if (answer.length < 2) {
          return { isValid: false, message: 'Please enter a valid state name' };
        }
        return { isValid: true, value: answer.trim() };

      default:
        // For select fields
        if (question.options && question.options.includes(answer)) {
          return { isValid: true, value: answer };
        }
        return { isValid: false, message: `Please select from: ${question.options.join(', ')}` };
    }
  }

  // Process completed form and suggest schemes
  async processCompletedForm(userId, state) {
    try {
      // Find eligible schemes based on collected data
      const eligibleSchemes = await this.findEligibleSchemes(state.collectedData);

      state.step = 'scheme_selection';
      state.eligibleSchemes = eligibleSchemes;

      return {
        type: 'form_completed',
        message: 'Perfect! I\'ve collected all your information. Here are the schemes you\'re eligible for:',
        formData: state.collectedData,
        eligibleSchemes: eligibleSchemes.slice(0, 5), // Show top 5
        suggestions: ['Apply to scheme', 'View all schemes', 'Modify information', 'Start over']
      };
    } catch (error) {
      console.error('Error processing form:', error);
      return {
        type: 'error',
        message: 'Sorry, I couldn\'t process your form. Please try again.',
        suggestions: ['Start over', 'Help']
      };
    }
  }

  // Get AI-powered recommendations
  async getAIRecommendations(userProfile) {
    const model = this.getAIModel();

    // 1. Get eligible schemes first to narrow down the list
    const eligibleSchemes = await this.findEligibleSchemes(userProfile);

    if (!model || eligibleSchemes.length === 0) {
      return eligibleSchemes;
    }

    try {
      // 2. Prepare data for AI
      const schemesList = eligibleSchemes.slice(0, 15).map(s =>
        `- ${s.name} (${s.category}): ${s.description}. Benefits: ${s.benefit}`
      ).join('\n');

      const profileSummary = `
        Age: ${userProfile.age}
        Gender: ${userProfile.gender}
        Income: ${userProfile.income}
        State: ${userProfile.state}
        Category: ${userProfile.caste || userProfile.category}
        Employment: ${userProfile.employment || userProfile.employmentStatus}
        Education: ${userProfile.education}
        Disability: ${userProfile.disabilityStatus ? 'Yes' : 'No'}
      `;

      const prompt = `
        You are Scheme Genie, an expert government scheme advisor.
        
        User Profile:
        ${profileSummary}

        Eligible Schemes:
        ${schemesList}

        Task:
        Analyze the user's profile and the eligible schemes. 
        Select the top 5 most relevant schemes for this specific user.
        For each selected scheme, provide a personalized "AI Insight" explaining why it is a good match.
        
        Return the response as a JSON array of objects with the following structure:
        [
          {
            "schemeName": "Exact Name of Scheme",
            "aiInsight": "Reason why this is good for the user",
            "matchScore": 95
          }
        ]
        Ensure the "matchScore" is a number between 0 and 100.
        Do not include any markdown formatting (like \`\`\`json) or explanation outside the JSON. Just the raw JSON string.
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Parse JSON response
      let recommendations = [];
      try {
        // Clean up potential markdown formatting
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        recommendations = JSON.parse(cleanJson);
      } catch (e) {
        console.error("Error parsing AI response:", e);
        console.log("Raw AI response:", responseText);
        return eligibleSchemes;
      }

      // Merge AI insights with full scheme objects
      const finalRecommendations = recommendations.map(rec => {
        const scheme = eligibleSchemes.find(s => s.name === rec.schemeName);
        if (scheme) {
          return {
            ...scheme.toObject(),
            aiInsight: rec.aiInsight,
            matchScore: rec.matchScore
          };
        }
        return null;
      }).filter(item => item !== null);

      // Sort by match score
      finalRecommendations.sort((a, b) => b.matchScore - a.matchScore);

      return finalRecommendations.length > 0 ? finalRecommendations : eligibleSchemes;

    } catch (error) {
      console.error("AI Recommendation Error:", error);
      return eligibleSchemes;
    }
  }

  // Find eligible schemes based on user data
  async findEligibleSchemes(userData) {
    try {
      const schemes = await Scheme.find({ isActive: true });

      const eligibleSchemes = schemes.filter(scheme => {
        // Check age eligibility
        if (scheme.eligibility?.age && userData.age) {
          const minAge = scheme.eligibility.age.min || 0;
          const maxAge = scheme.eligibility.age.max || 999;
          if (userData.age < minAge || userData.age > maxAge) return false;
        }

        // Check income eligibility
        if (scheme.eligibility?.income && userData.income) {
          const schemeIncome = parseInt(scheme.eligibility.income.replace(/[^0-9]/g, ''));
          if (userData.income > schemeIncome) return false;
        }

        // Check category eligibility
        if (scheme.eligibility?.caste && userData.category) {
          const schemeCategories = scheme.eligibility.caste;
          if (schemeCategories.length > 0 && !schemeCategories.includes('All') && !schemeCategories.includes(userData.category)) {
            return false;
          }
        }

        // Check gender eligibility
        if (scheme.eligibility?.gender && userData.gender) {
          if (scheme.eligibility.gender !== 'All' && scheme.eligibility.gender !== userData.gender) {
            return false;
          }
        }

        return true;
      });

      // Sort by relevance (you can implement more sophisticated scoring)
      return eligibleSchemes.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('Error finding eligible schemes:', error);
      return [];
    }
  }

  // Process document and extract form data
  async processDocumentForFormFilling(filePath, documentType, userId) {
    try {
      const state = this.getConversationState(userId);

      // Use OCR service to extract data
      const ocrResult = await this.getOCRService().processDocument(filePath, documentType);

      if (!ocrResult.success) {
        return {
          type: 'document_error',
          message: 'Sorry, I couldn\'t process your document. Please try uploading a clearer image.',
          suggestions: ['Try again', 'Upload different document', 'Fill form manually']
        };
      }

      // Map extracted data to form fields
      const extractedData = this.mapDocumentDataToForm(ocrResult.extractedData, documentType);

      // Update conversation state with extracted data
      state.collectedData = { ...state.collectedData, ...extractedData };
      state.documentProcessed = true;

      return {
        type: 'document_processed',
        message: 'Great! I\'ve extracted information from your document. Here\'s what I found:',
        extractedData: extractedData,
        confidence: ocrResult.confidence,
        suggestions: ['Continue with form', 'Correct information', 'Upload another document']
      };
    } catch (error) {
      console.error('Error processing document:', error);
      return {
        type: 'document_error',
        message: 'Sorry, I encountered an error processing your document.',
        suggestions: ['Try again', 'Fill form manually']
      };
    }
  }

  // Map document data to form fields
  mapDocumentDataToForm(extractedData, documentType) {
    const formData = {};

    switch (documentType.toLowerCase()) {
      case 'aadhaar':
        if (extractedData.name) formData.name = extractedData.name;
        if (extractedData.dateOfBirth) {
          formData.age = this.calculateAge(extractedData.dateOfBirth);
        }
        if (extractedData.gender) formData.gender = extractedData.gender;
        break;

      case 'pan':
        if (extractedData.name) formData.name = extractedData.name;
        if (extractedData.dateOfBirth) {
          formData.age = this.calculateAge(extractedData.dateOfBirth);
        }
        break;

      case 'income':
        if (extractedData.name) formData.name = extractedData.name;
        if (extractedData.annualIncome) formData.income = extractedData.annualIncome;
        break;

      case 'caste':
        if (extractedData.name) formData.name = extractedData.name;
        if (extractedData.caste) formData.category = this.mapCasteToCategory(extractedData.caste);
        break;
    }

    return formData;
  }

  // Calculate age from date of birth
  calculateAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  // Map caste to category
  mapCasteToCategory(caste) {
    const casteLower = caste.toLowerCase();
    if (casteLower.includes('sc') || casteLower.includes('scheduled caste')) return 'SC';
    if (casteLower.includes('st') || casteLower.includes('scheduled tribe')) return 'ST';
    if (casteLower.includes('obc') || casteLower.includes('other backward class')) return 'OBC';
    return 'General';
  }

  // Clear conversation state
  clearConversation(userId) {
    this.conversationStates.delete(userId);
    this.formFields.delete(userId);
  }

  // Get conversation history
  getConversationHistory(userId) {
    const state = this.getConversationState(userId);
    return {
      step: state.step,
      collectedData: state.collectedData,
      progress: state.currentQuestionIndex / state.pendingQuestions.length * 100
    };
  }
}

export default ChatbotService;
