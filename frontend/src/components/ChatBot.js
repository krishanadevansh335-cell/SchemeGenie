import { useState } from "react";
import { useLanguage } from '../contexts/LanguageContext';

const ChatBot = () => {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: t('chatbot.defaultMessage', "Hello! I'm SchemeGenie, your AI Scheme Assistant. Ask me about any government scheme or required documents."),
    },
  ]);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);

  // Detect language using external API (216 languages)
  const detectLanguage = async (text) => {
    try {
      const res = await fetch('https://ws.detectlanguage.com/0.2/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ed443ef62e9fc25b7a25398b158e412b'
        },
        body: JSON.stringify({ q: text })
      });
      const data = await res.json();
      // API returns language code in data.data.detections[0].language
      const lang = data?.data?.detections?.[0]?.language || 'en';
      return lang;
    } catch (e) {
      console.error('Language detection failed:', e);
      return 'en';
    }
  };

  const sendMessage = async () => {
    // Add user message and bot typing
    setMessages((prev) => [...prev, { sender: "user", text: input }, { sender: "bot", text: "⏳ Typing..." }]);
    const userText = input;
    setInput("");

    // Detect language of the user input
    const detectedLang = await detectLanguage(userText);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, language: detectedLang }),
      });

      const data = await res.json();

      // Replace "Typing..." with actual bot response
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { sender: "bot", text: data.response || "Sorry, I couldn't get a response right now." },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { sender: "bot", text: "⚠️ Server connection failed. Try again later." },
      ]);
      console.error(err);
    }
  };

  const { t, currentLanguage } = useLanguage();

  return (
    <>
      {/* Floating Button */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          backgroundColor: "#0059ff",
          color: "#fff",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "26px",
          cursor: "pointer",
          zIndex: 9999,
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        }}
      >
        💬
      </div>

      {/* Chat Widget */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: "90px",
            right: "20px",
            width: "360px",
            height: "480px",
            backgroundColor: "#fff",
            borderRadius: "16px",
            boxShadow: "0 4px 25px rgba(0,0,0,0.25)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 9999,
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              backgroundColor: "#0059ff",
              color: "white",
              padding: "12px",
              textAlign: "center",
              fontWeight: 600,
            }}
          >
            {t('chatbot.title', 'SchemeGenie Assistant')}
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              padding: "10px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              backgroundColor: "#f8f9fa",
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                  backgroundColor: msg.sender === "user" ? "#0059ff" : "#e0e0e0",
                  color: msg.sender === "user" ? "#fff" : "#000",
                  padding: "8px 12px",
                  borderRadius: "12px",
                  maxWidth: "80%",
                }}
              >
                {msg.text}
              </div>
            ))}
          </div>

          {/* Input */}
          <div style={{ display: "flex", borderTop: "1px solid #ddd", padding: "10px" }}>
            <input
              type="text"
              placeholder={t('chatbot.placeholder', 'Type your question...')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              style={{
                flex: 1,
                border: "1px solid #ccc",
                borderRadius: "8px",
                padding: "8px 10px",
                outline: "none",
              }}
            />
            <button
              onClick={sendMessage}
              style={{
                marginLeft: "8px",
                backgroundColor: "#0059ff",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "8px 14px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
