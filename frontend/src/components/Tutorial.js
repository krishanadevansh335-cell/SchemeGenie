import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Tutorial.css';

const Tutorial = ({ isOpen, onClose, startStep = 0 }) => {
    // Load state from localStorage if available
    const savedStep = localStorage.getItem('tutorialStep');
    const savedWaiting = localStorage.getItem('tutorialWaiting');

    const [currentStep, setCurrentStep] = useState(savedStep ? parseInt(savedStep) : startStep);
    const [spotlightStyle, setSpotlightStyle] = useState({});
    const [cardStyle, setCardStyle] = useState({});
    const [arrowStyle, setArrowStyle] = useState({});
    const [waitingForContinue, setWaitingForContinue] = useState(savedWaiting === 'true');
    const [isScrolling, setIsScrolling] = useState(false);
    const navigate = useNavigate();

    const tutorialSteps = useMemo(() => [
        {
            title: '👋 Welcome to SchemeGenie!',
            description: 'Let me show you around! This quick tour will help you discover all the amazing features to find and apply for government schemes.',
            target: null,
            position: 'center'
        },
        {
            title: '🔍 Browse Schemes',
            description: 'Click here to explore all available government schemes. Filter by category, search by keywords, and find schemes perfect for you!',
            target: '[href="/schemes"]',
            position: 'bottom',
            action: () => navigate('/schemes')
        },
        {
            title: '💡 AI Recommendations',
            description: 'Get personalized scheme recommendations powered by AI! Just fill in your profile and let our AI find the best matches for you.',
            target: '[href="/recommendations"]',
            position: 'bottom',
            action: () => navigate('/recommendations')
        },
        {
            title: '📄 Upload Documents',
            description: 'Upload your documents here (Aadhaar, PAN, Income Certificate, etc.). Our system will help auto-fill application forms!',
            target: '[href="/documents"]',
            position: 'bottom',
            action: () => navigate('/documents')
        },
        {
            title: '📋 Track Applications',
            description: 'View all your scheme applications in one place. Track their status, see updates, and manage your submissions easily.',
            target: '[href="/applications"]',
            position: 'bottom',
            action: () => navigate('/applications')
        },
        {
            title: '🤖 Meet Scheme Genie',
            description: 'Your AI assistant is always here to help! Ask questions, get guidance, or let it help you fill out forms. Click the chat icon to start!',
            target: '.chatbot-toggle',
            position: 'left'
        },
        {
            title: '🎉 You\'re All Set!',
            description: 'You now know how to use SchemeSeva! Start exploring schemes, upload your documents, and apply for benefits. Good luck!',
            target: null,
            position: 'center'
        }
    ], [navigate]);

    const currentStepData = tutorialSteps[currentStep];

    // Scroll detection effect
    useEffect(() => {
        if (!isOpen || !waitingForContinue) return;

        let scrollTimeout;
        const handleScroll = () => {
            setIsScrolling(true);
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                setIsScrolling(false);
            }, 1000); // Return to center 1 second after scrolling stops
        };

        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(scrollTimeout);
        };
    }, [isOpen, waitingForContinue]);

    useEffect(() => {
        if (!isOpen) return;

        const updatePositions = () => {
            const stepData = tutorialSteps[currentStep];

            // If waiting for user to continue after navigation
            if (waitingForContinue) {
                setSpotlightStyle({});

                // Move to corner when scrolling, center when not scrolling
                if (isScrolling) {
                    setCardStyle({
                        position: 'fixed',
                        bottom: '20px',
                        right: '20px',
                        top: 'auto',
                        left: 'auto',
                        transform: 'none',
                        transition: 'all 0.3s ease'
                    });
                } else {
                    setCardStyle({
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        transition: 'all 0.3s ease'
                    });
                }
                setArrowStyle({});
                return;
            }

            if (stepData.target) {
                const targetElement = document.querySelector(stepData.target);
                if (!targetElement) return;

                const rect = targetElement.getBoundingClientRect();

                setSpotlightStyle({
                    top: `${rect.top - 8}px`,
                    left: `${rect.left - 8}px`,
                    width: `${rect.width + 16}px`,
                    height: `${rect.height + 16}px`
                });

                let cardTop, cardLeft;
                const cardWidth = 400;
                const cardHeight = 250;

                switch (stepData.position) {
                    case 'bottom':
                        cardTop = rect.bottom + 20;
                        cardLeft = rect.left + (rect.width / 2) - (cardWidth / 2);
                        break;
                    case 'top':
                        cardTop = rect.top - cardHeight - 20;
                        cardLeft = rect.left + (rect.width / 2) - (cardWidth / 2);
                        break;
                    case 'left':
                        cardTop = rect.top + (rect.height / 2) - (cardHeight / 2);
                        cardLeft = rect.left - cardWidth - 20;
                        break;
                    case 'right':
                        cardTop = rect.top + (rect.height / 2) - (cardHeight / 2);
                        cardLeft = rect.right + 20;
                        break;
                    default:
                        cardTop = rect.bottom + 20;
                        cardLeft = rect.left;
                }

                cardTop = Math.max(20, Math.min(cardTop, window.innerHeight - cardHeight - 20));
                cardLeft = Math.max(20, Math.min(cardLeft, window.innerWidth - cardWidth - 20));

                setCardStyle({
                    top: `${cardTop}px`,
                    left: `${cardLeft}px`
                });

                if (stepData.position === 'bottom') {
                    setArrowStyle({
                        top: `${rect.bottom + 10}px`,
                        left: `${rect.left + rect.width / 2 - 30}px`,
                        transform: 'rotate(90deg)'
                    });
                } else if (stepData.position === 'left') {
                    setArrowStyle({
                        top: `${rect.top + rect.height / 2 - 30}px`,
                        left: `${rect.left - 70}px`,
                        transform: 'rotate(0deg)'
                    });
                } else {
                    setArrowStyle({});
                }
            } else {
                setSpotlightStyle({});
                setCardStyle({
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                });
                setArrowStyle({});
            }
        };

        updatePositions();
        window.addEventListener('resize', updatePositions);
        return () => window.removeEventListener('resize', updatePositions);
    }, [currentStep, isOpen, tutorialSteps, waitingForContinue, isScrolling]);

    const handleNext = () => {
        if (waitingForContinue) {
            // User clicked "Continue Tutorial" after navigation
            setWaitingForContinue(false);
            localStorage.setItem('tutorialWaiting', 'false');
            if (currentStep < tutorialSteps.length - 1) {
                const nextStep = currentStep + 1;
                setCurrentStep(nextStep);
                localStorage.setItem('tutorialStep', nextStep.toString());
            } else {
                onClose();
                localStorage.removeItem('tutorialStep');
                localStorage.removeItem('tutorialWaiting');
                navigate('/profile');
            }
        } else if (currentStep < tutorialSteps.length - 1) {
            const nextStep = currentStep + 1;
            setCurrentStep(nextStep);
            localStorage.setItem('tutorialStep', nextStep.toString());
        } else {
            onClose();
            localStorage.removeItem('tutorialStep');
            localStorage.removeItem('tutorialWaiting');
            navigate('/profile');
        }
    };

    const handleSkip = () => {
        localStorage.removeItem('tutorialStep');
        localStorage.removeItem('tutorialWaiting');
        onClose();
    };

    const handleAction = () => {
        if (currentStepData.action) {
            // Execute the navigation action
            currentStepData.action();
            // Set waiting state instead of immediately advancing
            setWaitingForContinue(true);
            localStorage.setItem('tutorialWaiting', 'true');
        } else {
            // No action, just go to next step
            handleNext();
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="tutorial-overlay active" onClick={handleSkip} />

            {currentStepData.target && (
                <div className="tutorial-spotlight" style={spotlightStyle} />
            )}

            {currentStepData.target && Object.keys(arrowStyle).length > 0 && (
                <div className="tutorial-arrow" style={arrowStyle}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="#0059ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            )}

            <div className={`tutorial-card ${isScrolling && waitingForContinue ? 'scrolling' : ''}`} style={cardStyle}>
                <div className="tutorial-progress">
                    {tutorialSteps.map((_, index) => (
                        <div
                            key={index}
                            className={`tutorial-progress-dot ${index === currentStep ? 'active' : ''}`}
                        />
                    ))}
                </div>

                <h3>{waitingForContinue ? '✨ Explore This Page' : currentStepData.title}</h3>
                <p>{waitingForContinue ? 'Take a moment to look around this page. When you\'re ready to continue the tutorial, click the button below!' : currentStepData.description}</p>

                <div className="tutorial-actions">
                    <button className="tutorial-btn tutorial-btn-skip" onClick={handleSkip}>
                        Skip Tour
                    </button>
                    {waitingForContinue ? (
                        <button className="tutorial-btn tutorial-btn-next" onClick={handleNext}>
                            Continue Tutorial →
                        </button>
                    ) : (
                        <button className="tutorial-btn tutorial-btn-next" onClick={handleAction}>
                            {currentStep === tutorialSteps.length - 1 ? 'Get Started!' : currentStepData.action ? 'Next →' : 'Next'}
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

export default Tutorial;
