import axios from 'axios';
import { MessageSquare, Mic, MicOff, RefreshCw, Send, Volume2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './SchemeChatBot.css';



// Language code mapping for 22 Indian languages
const INDIAN_LANGUAGES = {
  'hi': 'hi-IN',      // Hindi
  'bn': 'bn-IN',      // Bengali
  'ta': 'ta-IN',      // Tamil
  'te': 'te-IN',      // Telugu
  'mr': 'mr-IN',      // Marathi
  'gu': 'gu-IN',      // Gujarati
  'kn': 'kn-IN',      // Kannada
  'ml': 'ml-IN',      // Malayalam
  'pa': 'pa-IN',      // Punjabi
  'or': 'or-IN',      // Odia
  'as': 'as-IN',      // Assamese
  'ur': 'ur-IN',      // Urdu
  'sa': 'sa-IN',      // Sanskrit
  'ks': 'ks-IN',      // Kashmiri
  'kok': 'kok-IN',    // Konkani
  'mni': 'mni-IN',    // Manipuri
  'ne': 'ne-IN',      // Nepali
  'brx': 'brx-IN',    // Bodo
  'doi': 'doi-IN',    // Dogri
  'mai': 'mai-IN',    // Maithili
  'sat': 'sat-IN',    // Santali
  'sd': 'sd-IN',      // Sindhi
  'en': 'en-IN'       // English (India)
};

const SchemeChatBot = ({ onClose }) => {
  const { t, currentLanguage } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [usedVoiceInput, setUsedVoiceInput] = useState(false); // Track if user used voice
  const chatBoxRef = useRef(null);
  const chatContainerRef = useRef(null);
  const recognitionRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      // Enable continuous recognition (user controls when to stop)
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true; // Show interim results
      recognitionRef.current.maxAlternatives = 3;

      // Set language based on current language or default to Hindi
      const langCode = INDIAN_LANGUAGES[currentLanguage] || INDIAN_LANGUAGES['hi'];
      recognitionRef.current.lang = langCode;

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        console.log('Voice recognition started');
      };

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        // Update input with final transcript or show interim
        if (finalTranscript) {
          setInput(prev => prev + finalTranscript);
          setUsedVoiceInput(true); // Mark that voice was used
        } else if (interimTranscript) {
          // Show interim results in real-time (optional)
          setInput(prev => {
            // Remove previous interim and add new
            const lastFinalIndex = prev.lastIndexOf(' ');
            const base = lastFinalIndex > 0 ? prev.substring(0, lastFinalIndex + 1) : '';
            return base + interimTranscript;
          });
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setIsRecording(false);

        if (event.error === 'no-speech') {
          // Don't show error for no-speech when continuous mode
          console.log('No speech detected, but continuous mode is active');
        } else if (event.error === 'not-allowed') {
          setMessages(prev => [...prev, {
            sender: 'bot',
            text: t('chatbot.micPermission', 'Microphone permission denied. Please enable microphone access in your browser settings.')
          }]);
        } else if (event.error === 'network') {
          // Network errors can be frequent/transient in continuous mode
          // Log them but don't spam the user interface
          console.log('Speech recognition network error (transient)');
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        // If recording flag is still true, restart (for continuous mode)
        if (isRecording) {
          try {
            recognitionRef.current.start();
          } catch (error) {
            console.log('Recognition restart failed:', error);
            setIsRecording(false);
          }
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      // Stop speaking when unmounting
      window.speechSynthesis.cancel();
    };
  }, [currentLanguage, t, isRecording]);

  // Initialize the chat with a welcome message
  useEffect(() => {
    if (!isInitialized && t) {
      setMessages([
        {
          sender: 'bot',
          text: t('chatbot.defaultMessage', 'Hello! I am SchemeGenie. How can I help you today? 🎤 You can use voice input in your preferred Indian language - just click the mic to start and click again to stop!')
        }
      ]);
      setIsInitialized(true);
    }
  }, [t, isInitialized]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  // Text-to-Speech function
  const speakMessage = (text) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Text-to-speech not supported');
      return;
    }

    // Cancel any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Set language
    const langCode = INDIAN_LANGUAGES[currentLanguage] || 'en-IN';
    utterance.lang = langCode;

    // Try to find a matching voice
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(voice => voice.lang.includes(langCode.split('-')[0]));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
  };

  // Handle voice input
  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setIsListening(false);
    } else {
      try {
        // Update language before starting
        const langCode = INDIAN_LANGUAGES[currentLanguage] || INDIAN_LANGUAGES['hi'];
        recognitionRef.current.lang = langCode;

        recognitionRef.current.start();
        setIsRecording(true);
        setUsedVoiceInput(true); // Mark that we are using voice
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setIsRecording(false);
        setIsListening(false);
      }
    }
  };

  // Handle action button clicks
  const handleActionClick = async (action, message) => {
    const actionType = action.type;
    
    if (actionType === 'import_profile') {
      // Add user message
      setMessages(prev => [...prev, { sender: 'user', text: 'Import from Profile' }]);
      setIsTyping(true);

      try {
        // Get user profile
        const token = localStorage.getItem('token');
        const profileResponse = await axios.get('http://localhost:5002/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const profile = profileResponse.data;

        // Send profile data to chatbot for scheme filtering
        const response = await axios.post('http://localhost:5002/api/chatbot', {
          message: `filter schemes with profile: ${JSON.stringify(profile)}`,
          language: currentLanguage,
          profileData: profile,
          category: message.category
        });

        const botResponse = response.data.response;
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: botResponse,
          actions: response.data.actions
        }]);

        // Auto-speak if voice was used
        if (usedVoiceInput) {
          speakMessage(botResponse);
        }

      } catch (error) {
        console.error('Error importing profile:', error);
        const errorMsg = 'I couldn\'t access your profile. Please make sure you\'ve filled out your profile first, or try manual input instead.';
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: errorMsg
        }]);
        if (usedVoiceInput) speakMessage(errorMsg);
      } finally {
        setIsTyping(false);
      }
    } else if (actionType === 'manual_input') {
      // Add user message
      setMessages(prev => [...prev, { sender: 'user', text: 'Manual Input' }]);
      const botResponse = 'Great! Let me ask you a few quick questions to find the best schemes for you.\n\nWhat is your age?';
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: botResponse
      }]);

      if (usedVoiceInput) speakMessage(botResponse);
    } else if (actionType === 'suggestion') {
      // Handle generic suggestions by sending the label as a message
      const textToSend = action.label || action.text;
      setInput(textToSend);
      // We can either auto-send or just populate input. 
      // Let's auto-send for better UX, simulating a user message.
      
      // Manually trigger send logic (reusing handleSendMessage logic would be best, but let's duplicate for now to be safe)
      const userMessage = { sender: 'user', text: textToSend };
      setMessages(prev => [...prev, userMessage]);
      setIsTyping(true);

      try {
        const response = await axios.post('http://localhost:5002/api/chatbot', {
          message: textToSend,
          language: currentLanguage
        });

        const botResponseText = response.data.response;
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: botResponseText,
          actions: response.data.actions,
          category: response.data.category,
          schemeCount: response.data.schemeCount
        }]);

        if (usedVoiceInput) speakMessage(botResponseText);
      } catch (error) {
        console.error('Error getting response:', error);
        setMessages(prev => [...prev, { sender: 'bot', text: "I'm having trouble connecting right now." }]);
      } finally {
        setIsTyping(false);
      }
    }
  };

  // Handle restart conversation
  const handleRestart = async () => {
    setMessages([]); // Clear chat history
    setIsTyping(true);
    try {
      // Send 'restart' command to backend to reset state
      const response = await axios.post('http://localhost:5002/api/chatbot', {
        message: 'restart',
        language: currentLanguage
      });

      const botResponseText = response.data.response;
      setMessages([{
        sender: 'bot',
        text: botResponseText,
        actions: response.data.actions
      }]);
      
      if (usedVoiceInput) speakMessage(botResponseText);
    } catch (error) {
      console.error('Error restarting chat:', error);
      setMessages([{ 
        sender: 'bot', 
        text: "Hello! I'm Scheme Genie. How can I help you today?",
        actions: [
            { type: 'suggestion', label: 'Find schemes', text: 'Find schemes' },
            { type: 'suggestion', label: 'Fill application form', text: 'Fill application form' },
            { type: 'suggestion', label: 'Upload documents', text: 'Upload documents' },
            { type: 'suggestion', label: 'Help', text: 'Help' }
        ]
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle sending a message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const message = input.trim();
    if (!message) return;

    // Add user message to chat
    const userMessage = { sender: 'user', text: message };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // Get bot response from backend
      const response = await axios.post('http://localhost:5002/api/chatbot', {
        message: message,
        language: currentLanguage // Send current language to backend
      });

      const botResponseText = response.data.response;

      // Add bot response to chat with all metadata
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: botResponseText,
        actions: response.data.actions,
        category: response.data.category,
        schemeCount: response.data.schemeCount
      }]);

      // Auto-speak if user used voice input recently
      if (usedVoiceInput) {
        speakMessage(botResponseText);
      }

    } catch (error) {
      console.error('Error getting response from chatbot:', error);
      // Provide helpful response when server is not available
      const helpMessages = [
        "I can help you find government schemes! Ask me about education, healthcare, employment schemes, or any government benefits.",
        "Looking for schemes in a specific category? Try asking about agriculture, education, healthcare, housing, or employment schemes.",
        "You can ask me about eligibility requirements, benefits, documents needed, or application process for any government scheme."
      ];
      const randomResponse = helpMessages[Math.floor(Math.random() * helpMessages.length)];
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: randomResponse
      }]);

      if (usedVoiceInput) speakMessage(randomResponse);
    } finally {
      setIsTyping(false);
      // Reset voice input flag after response (optional, or keep it true for session)
      // setUsedVoiceInput(false); 
    }
  };

  // Toggle chat window
  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        chatContainerRef.current &&
        !chatContainerRef.current.contains(event.target) &&
        !event.target.closest('.chatbot-toggle')
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="chatbot-widget">
      {/* Floating Toggle Button */}
      <button
        className="chatbot-toggle"
        onClick={toggleChat}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {/* Chat Container */}
      <div
        ref={chatContainerRef}
        className={`chatbot-container ${isOpen ? 'open' : ''}`}
        style={{ display: isOpen ? 'flex' : 'none' }}
      >
        <div className="chat-header">
          <span>{t('chatbot.title', 'SchemeGenie Assistant')}</span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              className="restart-btn" 
              onClick={handleRestart} 
              title="Restart Conversation"
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <RefreshCw size={18} />
            </button>
            <button className="close-btn" onClick={toggleChat}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="chat-box" ref={chatBoxRef}>
          {messages.map((message, index) => (
            <div key={index}>
              <div
                className={`message ${message.sender}`}
              >
                {message.text.split('\n').map((line, i) => (
                  <p key={i} style={{ margin: '4px 0' }}>{line}</p>
                ))}

                {/* Speak button for bot messages */}
                {message.sender === 'bot' && (
                  <button
                    className="speak-btn"
                    onClick={() => speakMessage(message.text)}
                    title="Read aloud"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      opacity: 0.7,
                      cursor: 'pointer',
                      marginTop: '5px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Volume2 size={14} />
                  </button>
                )}
              </div>

              {/* Action buttons for scheme search */}
              {message.actions && message.actions.length > 0 && (
                <div className="chat-actions">
                  {message.actions.map((action, actionIndex) => (
                    <button
                      key={actionIndex}
                      className="chat-action-btn"
                      onClick={() => handleActionClick(action, message)}
                    >
                      <span className="action-label">{action.label}</span>
                      {action.description && (
                        <span className="action-description">{action.description}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="message bot typing">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
          )}
          {isListening && (
            <div className="message bot listening">
              <span className="listening-indicator">🎤 Listening...</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSendMessage} className="chat-input">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // If user types manually, we might want to disable auto-speak
              // setUsedVoiceInput(false); 
            }}
            placeholder={t('chatbot.placeholder', 'Type your message...')}
            aria-label="Type your message"
          />
          <button
            type="button"
            className={`voice-btn ${isRecording ? 'recording' : ''}`}
            onClick={handleVoiceInput}
            title={isRecording ? 'Stop recording' : 'Start voice input'}
          >
            {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <button type="submit" disabled={isTyping || !input.trim()}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default SchemeChatBot;
