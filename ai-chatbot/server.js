// --- 1. Bring in required libraries ---
import express from "express";
import cors from "cors";
import axios from "axios";
import "dotenv/config"; // this loads your .env file automatically

// --- 2. Initialize app ---
const app = express();
app.use(cors());
app.use(express.json());

// --- 3. Create an API endpoint the frontend will call ---
app.post("/chat", async (req, res) => {
  const userMessage = req.body.message; // message from the user

  try {
    // --- 4. Make a call to Google Generative Language API (PaLM/Gemini) ---
    // See: https://cloud.google.com/vertex-ai/docs/generative-ai/multimodal/send-chat-prompts
    // Example endpoint: https://generativelanguage.googleapis.com/v1beta/models/chat-bison-001:generateMessage
    const endpoint =
      "https://generativelanguage.googleapis.com/v1beta/models/chat-bison-001:generateMessage";

    const apiKey = process.env.GOOGLE_API_KEY || "AIzaSyD-tLRjNRLtzf6SAMefOB4R1sO6n__nVOQ";
    const response = await axios.post(
      `${endpoint}?key=${apiKey}`,
      {
        prompt: { messages: [{ content: userMessage, author: "user" }] },
      }
    );

    // --- 5. Send the API’s reply back to the React app ---
    const reply =
      response.data.candidates && response.data.candidates[0]
        ? response.data.candidates[0].content
        : "Sorry, I didn't get a response from the AI.";
    res.json({ reply });
  } catch (error) {
    console.error("API error:", error.message, error.response?.data ?? "");
    res.status(500).json({
      reply: "Something went wrong on the server.",
      error: error.message,
      details: error.response?.data || null,
    });
  }
});

// --- 6. Start the server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));