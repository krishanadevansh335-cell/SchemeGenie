/* eslint-disable react/no-unknown-property */
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import { FiArrowRight, FiCheck, FiCpu, FiRefreshCw, FiSend } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { InteractiveRobotSpline } from "./ui/interactive-3d-robot";


class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.log('Robot component error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }

        return this.props.children;
    }
}

// Constants for options
const EDUCATION_LEVELS = [
    'Below 10th', '10th Pass', '12th Pass', 'Diploma',
    'Graduate', 'Post Graduate', 'Doctorate'
];

const EMPLOYMENT_TYPES = [
    'Employed', 'Unemployed', 'Student', 'Self-Employed', 'Retired'
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

const CASTE_OPTIONS = ['General', 'OBC', 'SC', 'ST', 'Other'];

const INCOME_BRACKETS = [
    '< 1 Lakh', '1-3 Lakhs', '3-6 Lakhs', '> 6 Lakhs'
];

const STATES = [
    'Maharashtra', 'Delhi', 'Karnataka',
    'Tamil Nadu', 'Uttar Pradesh', 'Other'
];

const QUESTIONS = [
    {
        id: 'age',
        text: "Hello! I'm your Scheme Assistant. Let's find the best government schemes for you. First, may I know your age?",
        type: 'number',
        placeholder: 'Enter your age (e.g., 25)'
    },
    {
        id: 'gender',
        text: "Great. Next, what is your gender?",
        type: 'select',
        options: GENDER_OPTIONS
    },
    {
        id: 'income',
        text: "Understood. What is your annual family income bracket?",
        type: 'select',
        options: INCOME_BRACKETS
    },
    {
        id: 'caste',
        text: "Thank you. Which category do you belong to?",
        type: 'select',
        options: CASTE_OPTIONS
    },
    {
        id: 'state',
        text: "Which state are you currently residing in?",
        type: 'select',
        options: STATES
    },
    {
        id: 'education',
        text: "What is your highest educational qualification?",
        type: 'select',
        options: EDUCATION_LEVELS
    },
    {
        id: 'employment',
        text: "Almost done! What is your current employment status?",
        type: 'select',
        options: EMPLOYMENT_TYPES
    },
    {
        id: 'custom',
        text: "Finally, is there anything specific you are looking for? You can express yourself freely here (e.g., 'I need a scholarship for engineering').",
        type: 'textarea',
        placeholder: 'Type your specific needs here...'
    }
];

// 3D Robot Scene URL
const ROBOT_SCENE_URL = "https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode";

const InteractiveRecommendationsPage = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState({
        age: '',
        gender: '',
        income: '',
        caste: '',
        state: '',
        education: '',
        employment: '',
        custom: ''
    });
    const [chatHistory, setChatHistory] = useState([
        { type: 'bot', text: QUESTIONS[0].text }
    ]);
    const [isThinking, setIsThinking] = useState(false);
    const [recommendations, setRecommendations] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [selectedScheme, setSelectedScheme] = useState(null);
    const [showSchemeDetails, setShowSchemeDetails] = useState(false);
    const messagesEndRef = useRef(null);
    const robotRef = useRef();

    // Function to get relevant schemes based on user's query and profile
    const getQueryBasedSchemes = (answers) => {
        const schemes = [];
        const query = answers.custom ? answers.custom.toLowerCase() : '';
        const age = parseInt(answers.age) || 0;

        // Education-related schemes
        if (query.includes('scholarship') || query.includes('education') || answers.education === 'Student' || age < 25) {
            schemes.push({
                id: 'query-scholarship-1',
                name: 'National Scholarship Portal',
                description: 'Centralized platform for various scholarship schemes for students from class 1 to postgraduate level',
                category: 'Education',
                benefit: 'Financial assistance for education based on merit and economic background',
                matchScore: 85,
                matchReason: 'Education/Scholarship match'
            });
        }

        // Employment-related schemes
        if (query.includes('employment') || query.includes('job') || answers.employment === 'Unemployed') {
            schemes.push({
                id: 'query-employment-1',
                name: 'Pradhan Mantri Kaushal Vikas Yojana (PMKVY)',
                description: 'Skill development scheme to enable youth to take up industry-relevant skill training',
                category: 'Employment',
                benefit: 'Free skill training and certification with placement assistance',
                matchScore: 82,
                matchReason: 'Employment/Skill development match'
            });
        }

        // Business/Entrepreneurship schemes
        if (query.includes('business') || query.includes('startup') || query.includes('entrepreneur')) {
            schemes.push({
                id: 'query-business-1',
                name: 'Pradhan Mantri Mudra Yojana',
                description: 'Financial support for micro-enterprises and small businesses',
                category: 'Business',
                benefit: 'Collateral-free loans up to ₹10 lakh for small businesses',
                matchScore: 80,
                matchReason: 'Business/Startup match'
            });
        }

        // Agriculture schemes
        if (query.includes('agriculture') || query.includes('farming') || query.includes('farmer')) {
            schemes.push({
                id: 'query-agri-1',
                name: 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
                description: 'Income support scheme for small and marginal farmers',
                category: 'Agriculture',
                benefit: '₹6,000 per year in three equal installments to eligible farmer families',
                matchScore: 83,
                matchReason: 'Agriculture/Farmer match'
            });
        }

        // Housing schemes
        if (query.includes('housing') || query.includes('house') || query.includes('home')) {
            schemes.push({
                id: 'query-housing-1',
                name: 'Pradhan Mantri Awas Yojana (PMAY)',
                description: 'Housing for All initiative providing affordable housing solutions',
                category: 'Housing',
                benefit: 'Interest subsidy on home loans and housing assistance',
                matchScore: 78,
                matchReason: 'Housing match'
            });
        }

        // Women-specific schemes
        if (answers.gender === 'Female' || query.includes('women') || query.includes('woman')) {
            schemes.push({
                id: 'query-women-1',
                name: 'Beti Bachao Beti Padhao',
                description: 'Scheme for survival, protection, and education of the girl child',
                category: 'Women Welfare',
                benefit: 'Financial assistance and support for girl child education and welfare',
                matchScore: 77,
                matchReason: 'Women welfare match'
            });
        }

        // Senior citizen schemes
        if (age >= 60 || query.includes('senior') || query.includes('pension') || query.includes('elderly')) {
            schemes.push({
                id: 'query-senior-1',
                name: 'Pradhan Mantri Vaya Vandana Yojana',
                description: 'Pension scheme for senior citizens providing assured returns',
                category: 'Pension',
                benefit: 'Assured pension of up to ₹10,000 per month for senior citizens',
                matchScore: 75,
                matchReason: 'Senior citizen/Pension match'
            });
        }

        // Health schemes
        if (query.includes('health') || query.includes('medical') || query.includes('hospital')) {
            schemes.push({
                id: 'query-health-1',
                name: 'Ayushman Bharat Pradhan Mantri Jan Arogya Yojana (AB-PMJAY)',
                description: 'National Health Protection Scheme providing health coverage',
                category: 'Health',
                benefit: 'Health coverage of up to ₹5 lakh per family per year for secondary and tertiary care',
                matchScore: 84,
                matchReason: 'Health/Medical match'
            });
        }

        // If no specific matches, add general schemes
        if (schemes.length === 0) {
            schemes.push(
                {
                    id: 'query-general-1',
                    name: 'Pradhan Mantri Jan Dhan Yojana',
                    description: 'Financial inclusion program providing access to banking services',
                    category: 'Financial Inclusion',
                    benefit: 'Zero balance account with accident insurance and overdraft facility',
                    matchScore: 70,
                    matchReason: 'Popular financial inclusion scheme'
                },
                {
                    id: 'query-general-2',
                    name: 'Atal Pension Yojana',
                    description: 'Pension scheme focused on the unorganized sector workers',
                    category: 'Pension',
                    benefit: 'Fixed pension of ₹1,000-5,000 per month after age 60',
                    matchScore: 68,
                    matchReason: 'Universal pension scheme'
                }
            );
        }

        // Sort by match score and return top 6
        return schemes.sort((a, b) => b.matchScore - a.matchScore).slice(0, 6);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory]);

    const handleAnswer = async (value) => {
        // Update answers
        const currentQuestion = QUESTIONS[currentStep];
        const newAnswers = { ...answers, [currentQuestion.id]: value };
        setAnswers(newAnswers);

        // Add user response to chat
        setChatHistory(prev => [...prev, { type: 'user', text: value }]);

        // Robot interaction
        if (robotRef.current) {
            robotRef.current.playNod();
            setTimeout(() => {
                robotRef.current.playSpeak();
            }, 1000);
        }

        // Move to next step or submit
        if (currentStep < QUESTIONS.length - 1) {
            setTimeout(() => {
                const nextQuestion = QUESTIONS[currentStep + 1];
                setChatHistory(prev => [...prev, { type: 'bot', text: nextQuestion.text }]);
                setCurrentStep(prev => prev + 1);
                // Return to idle after speaking
                if (robotRef.current) {
                    setTimeout(() => robotRef.current.playIdle(), 2000);
                }
            }, 500);
        } else {
            // Submit
            await getRecommendations(newAnswers);
        }
    };

    const getSearchTips = (profile) => {
        const tips = [];
        if (profile.income === '> 6 Lakhs' || profile.income === '3-6 Lakhs') {
            tips.push("many government schemes are income-restricted (often below 2-3 Lakhs)");
        }
        if (profile.caste === 'General') {
            tips.push("some schemes are reserved for specific categories (SC/ST/OBC)");
        }
        if (profile.employment === 'Employed') {
            tips.push("many schemes target the unemployed or self-employed");
        }

        if (tips.length === 0) return "try adjusting your age, location, or specific keywords.";
        return `try adjusting criteria like Income or Category, as ${tips.join(', and ')}.`;
    };

    const getRecommendations = async (finalAnswers) => {
        setIsThinking(true);
        setChatHistory(prev => [...prev, { type: 'bot', text: "Processing your profile and finding the best schemes for you..." }]);
        
        if (robotRef.current) {
            robotRef.current.playSpeak();
        }

        try {
            // Prepare profile data for backend
            const profileData = {
                age: parseInt(finalAnswers.age) || 0,
                gender: finalAnswers.gender,
                income: finalAnswers.income,
                caste: finalAnswers.caste,
                state: finalAnswers.state,
                education: finalAnswers.education,
                employmentStatus: finalAnswers.employment,
                category: finalAnswers.caste,
                query: finalAnswers.custom // Pass the custom query
            };

            console.log('Sending profile data:', profileData);

            // Call backend API
            const response = await axios.post('/api/schemes/recommend', profileData);
            console.log('Backend response:', response.data);
            
            let matchedSchemes = [];
            if (response.data && response.data.recommendations) {
                matchedSchemes = response.data.recommendations;
            } else {
                // Fallback to local logic if backend fails or returns empty
                console.log('Using local fallback logic');
                matchedSchemes = getQueryBasedSchemes(finalAnswers);
            }

            setRecommendations(matchedSchemes);
            setShowResults(true);
            setIsThinking(false);
            
            if (robotRef.current) {
                robotRef.current.playCelebrate();
                setTimeout(() => robotRef.current.playIdle(), 3000);
            }

            if (matchedSchemes.length > 0) {
                setChatHistory(prev => [...prev, { 
                    type: 'bot', 
                    text: `I found ${matchedSchemes.length} schemes that match your profile! Here are the top recommendations.` 
                }]);
            } else {
                const tips = getSearchTips(finalAnswers);
                setChatHistory(prev => [...prev, { 
                    type: 'bot', 
                    text: `I couldn't find any specific schemes matching all your criteria. However, ${tips} You can also browse all schemes.` 
                }]);
            }
        } catch (error) {
            console.error('Error fetching recommendations:', error);
            setIsThinking(false);
            
            // Fallback to local logic on error
            const matchedSchemes = getQueryBasedSchemes(finalAnswers);
            setRecommendations(matchedSchemes);
            setShowResults(true);
            
            if (robotRef.current) {
                robotRef.current.playIdle();
            }

            setChatHistory(prev => [...prev, { 
                type: 'bot', 
                text: "I'm having trouble connecting to the server, but I found some schemes based on your profile locally." 
            }]);
        }
    };

    const resetChat = () => {
        setCurrentStep(0);
        setAnswers({
            age: '',
            gender: '',
            income: '',
            caste: '',
            state: '',
            education: '',
            employment: '',
            custom: ''
        });
        setChatHistory([{ type: 'bot', text: QUESTIONS[0].text }]);
    };

    return (
        <div className="relative min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0">
                <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400/30 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-400/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-400/30 rounded-full blur-3xl animate-pulse delay-500"></div>
            </div>


            {/* 3D Robot Assistant - Centered */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[700px] md:h-[700px] lg:w-[800px] lg:h-[800px] z-5 pointer-events-none">
                <ErrorBoundary fallback={
                    <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
                        <div className="text-center">
                            <FiCpu className="text-4xl mx-auto mb-2 text-blue-400" />
                            <p className="text-sm">Robot Assistant</p>
                        </div>
                    </div>
                }>
                    <InteractiveRobotSpline
                        scene={ROBOT_SCENE_URL}
                        className="w-full h-full pointer-events-auto"
                    />
                </ErrorBoundary>
            </div>


            {/* Overlay Content Layer */}
            <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">

                {/* Header */}
                <div className="p-4 flex justify-between items-center bg-gradient-to-b from-gray-900/90 to-transparent pointer-events-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <FiCpu className="text-white text-xl" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-white drop-shadow-md">Scheme Assistant</h2>
                            <span className="text-xs text-green-400 flex items-center gap-1 font-medium drop-shadow-sm">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                Online
                            </span>
                        </div>
                    </div>
                    <button onClick={resetChat} className="p-2 hover:bg-white/10 rounded-full transition-colors backdrop-blur-sm" title="Restart">
                        <FiRefreshCw className="text-white" />
                    </button>
                </div>

                {/* Chat Messages Area - Positioned at the top/center, above the robot */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide pointer-events-auto mask-image-gradient">
                    <div className="max-w-2xl mx-auto w-full flex flex-col gap-4 pb-20">
                        <AnimatePresence>
                            {chatHistory.map((msg, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] md:max-w-[60%] p-4 rounded-2xl backdrop-blur-md shadow-lg border ${msg.type === 'user'
                                            ? 'bg-blue-600/90 text-white rounded-tr-none border-blue-500/50'
                                            : 'bg-gray-800/80 text-gray-100 rounded-tl-none border-gray-700/50'
                                            }`}
                                    >
                                        <p className="text-sm md:text-base leading-relaxed">{msg.text}</p>
                                    </div>
                                </motion.div>
                            ))}
                            {isThinking && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex justify-start"
                                >
                                    <div className="bg-gray-800/80 text-gray-100 p-4 rounded-2xl rounded-tl-none backdrop-blur-md shadow-lg border border-gray-700/50">
                                        <div className="flex gap-2">
                                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
                                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></span>
                                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </AnimatePresence>
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-4 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent pointer-events-auto">
                    <div className="max-w-2xl mx-auto w-full">
                        {!showResults && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex gap-2"
                            >
                                {QUESTIONS[currentStep].type === 'select' ? (
                                    <div className="flex flex-wrap gap-2 w-full">
                                        {QUESTIONS[currentStep].options.map((option) => (
                                            <button
                                                key={option}
                                                onClick={() => handleAnswer(option)}
                                                className="flex-1 min-w-[120px] p-3 bg-gray-800/80 hover:bg-blue-600/80 text-white rounded-xl transition-all duration-300 border border-gray-700 hover:border-blue-500 backdrop-blur-sm shadow-lg hover:shadow-blue-500/25"
                                            >
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="relative w-full">
                                        <input
                                            type={QUESTIONS[currentStep].type}
                                            placeholder={QUESTIONS[currentStep].placeholder}
                                            className="w-full p-4 pr-12 bg-gray-800/80 text-white rounded-xl border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all backdrop-blur-sm shadow-lg"
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter' && e.target.value) {
                                                    handleAnswer(e.target.value);
                                                    e.target.value = '';
                                                }
                                            }}
                                        />
                                        <button
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition-colors shadow-md"
                                            onClick={(e) => {
                                                const input = e.currentTarget.parentElement.querySelector('input');
                                                if (input && input.value) {
                                                    handleAnswer(input.value);
                                                    input.value = '';
                                                }
                                            }}
                                        >
                                            <FiSend />
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>
                </div>

            <AnimatePresence>
                {showSchemeDetails && selectedScheme && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm pointer-events-auto"
                        onClick={() => setShowSchemeDetails(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium mb-2 border border-blue-500/30">
                                            {selectedScheme.category}
                                        </span>
                                        <h2 className="text-2xl font-bold text-white">{selectedScheme.name}</h2>
                                    </div>
                                    <button
                                        onClick={() => setShowSchemeDetails(false)}
                                        className="text-gray-400 hover:text-white transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                                        <h3 className="text-gray-400 text-sm font-medium mb-1">Description</h3>
                                        <p className="text-gray-200">{selectedScheme.description}</p>
                                    </div>

                                    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                                        <h3 className="text-gray-400 text-sm font-medium mb-1">Benefits</h3>
                                        <p className="text-gray-200">{selectedScheme.benefit}</p>
                                    </div>

                                    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                                        <h3 className="text-gray-400 text-sm font-medium mb-1">Match Reason</h3>
                                        <div className="flex items-center gap-2 text-green-400">
                                            <FiCheck />
                                            <span>{selectedScheme.matchReason}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4 border-t border-gray-800">
                                    <button
                                        onClick={() => {
                                            setShowSchemeDetails(false);
                                            navigate(`/schemes/${selectedScheme.id}`);
                                        }}
                                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                                    >
                                        View Full Details <FiArrowRight />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Results Overlay */}
            <AnimatePresence>
                {showResults && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-t border-gray-700 rounded-t-3xl shadow-2xl z-50 max-h-[80vh] overflow-hidden flex flex-col pointer-events-auto"
                    >
                        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
                                Recommended Schemes
                                <span className="text-sm font-normal text-gray-400 ml-2">({recommendations.length} found)</span>
                            </h3>
                            <button
                                onClick={() => setShowResults(false)}
                                className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {recommendations.map((scheme, index) => (
                                <motion.div
                                    key={scheme.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="bg-gray-800 p-4 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-all cursor-pointer group"
                                    onClick={() => {
                                        setSelectedScheme(scheme);
                                        setShowSchemeDetails(true);
                                    }}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-lg border border-blue-500/20">
                                            {scheme.category}
                                        </span>
                                        <div className="flex items-center gap-1 text-green-400 text-sm font-medium">
                                            <span>{scheme.matchScore}% Match</span>
                                        </div>
                                    </div>
                                    <h4 className="text-white font-semibold mb-1 group-hover:text-blue-400 transition-colors">
                                        {scheme.name}
                                    </h4>
                                    <p className="text-gray-400 text-sm line-clamp-2">{scheme.description}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            </div>
        </div>
    );
};

export default InteractiveRecommendationsPage;
