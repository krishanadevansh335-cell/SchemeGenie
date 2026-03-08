import express from "express";
import ChatbotService from "./chatbot-service.js";

const router = express.Router();
const chatbotService = new ChatbotService();

// Chatbot endpoint
router.post("/api/chatbot", async (req, res) => {
  const { message, userId, language } = req.body;
  const currentUserId = userId || "guest"; // Default to guest if no userId

  try {
    console.log(`Processing chat message for user ${currentUserId}: ${message}`);
    // Process message using ChatbotService
    const response = await chatbotService.processMessage(currentUserId, message, {}, language);
    console.log("Chatbot response generated successfully");

    // Format response for frontend
    // The frontend expects { response: "message text" }
    // ChatbotService returns { type, message, suggestions, ... }

    let responseText = response.message;
    let actions = response.actions || [];

    // Convert suggestions to actions if actions are empty
    if ((!actions || actions.length === 0) && response.suggestions && response.suggestions.length > 0) {
      actions = response.suggestions.map(s => ({
        type: 'suggestion',
        label: s,
        text: s
      }));
    }

    // Append suggestions to text only if they are NOT being shown as actions
    // (Optional: you can decide to show both, but usually buttons are enough)
    // For now, let's keep the text append as fallback or for history
    if (response.suggestions && response.suggestions.length > 0) {
       // responseText += "\n\nSuggestions:\n" + response.suggestions.map(s => `• ${s}`).join("\n");
    }

    res.json({
      response: responseText,
      actions: actions,
      ...response 
    });

  } catch (err) {
    console.error("Chatbot error:", err);
    res.status(500).json({
      response: "I'm sorry, I encountered an error processing your request. Please try again.",
      error: err.message
    });
  }
});

// Keep the old /chat endpoint for backward compatibility or other clients
router.post("/chat", async (req, res) => {
  const { message, userId } = req.body;
  const currentUserId = userId || "guest";

  try {
    const response = await chatbotService.processMessage(currentUserId, message);
    res.json({ reply: response.message });
  } catch (err) {
    console.error("Chatbot error:", err);
    res.status(500).json({ reply: "Error processing request" });
  }
});

// AI Recommendations endpoint
router.post("/api/recommendations/ai", async (req, res) => {
  const { profile } = req.body;

  if (!profile) {
    return res.status(400).json({ error: "User profile is required" });
  }

  try {
    const recommendations = await chatbotService.getAIRecommendations(profile);
    res.json({ recommendations });
  } catch (err) {
    console.error("AI Recommendations error:", err);
    res.status(500).json({
      error: "Failed to generate recommendations",
      message: err.message
    });
  }
});

export default router;