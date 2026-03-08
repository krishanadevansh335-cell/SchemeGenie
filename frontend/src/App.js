import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AdminApplicationDetailsPage from "./components/AdminApplicationDetailsPage";
import AdminApplicationsPage from "./components/AdminApplicationsPage";
import AdminDashboard from "./components/AdminDashboard";
import AdminDocumentsPage from "./components/AdminDocumentsPage";
import AdminSettingsPage from "./components/AdminSettingsPage";
import AdminUsersPage from "./components/AdminUsersPage";
import ApplicationReviewPage from "./components/ApplicationReviewPage";
import ApplicationsPage from "./components/ApplicationsPage";
import ApplicationTrackingPage from "./components/ApplicationTrackingPage";
import ApplyPage from "./components/ApplyPage";
import DocumentsPage from "./components/DocumentsPage";
import FeedbackPage from "./components/FeedbackPage";
import HomePage from "./components/HomePage";
import InteractiveRecommendationsPage from "./components/InteractiveRecommendationsPage";
import LoginPage from "./components/LoginPage";
import ProfilePage from "./components/ProfilePage";
// import RecommendationsPage from "./components/RecommendationsPage";
import SchemeApprovalPage from "./components/SchemeApprovalPage";
import SchemeChatBot from "./components/SchemeChatBot";
import "./components/SchemeChatBot.css";
import SchemesPage from "./components/SchemesPage";
import SchemeTracking from "./components/SchemeTracking";
import TrackingPage from "./components/TrackingPage";
import TubelightNavbarDemo from "./components/TubelightNavbarDemo";
import Tutorial from "./components/Tutorial";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "./contexts/ThemeContext";

function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('user');
  const [showChatBot, setShowChatBot] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Check for existing authentication
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (token && role) {
      setIsLoggedIn(true);
      setUserRole(role);
    }
    // Keep demo mode for development (comment out for production)
    // else {
    //   const demoToken = "demo_token_12345";
    //   const demoRole = "user";
    //   localStorage.setItem("token", demoToken);
    //   localStorage.setItem("role", demoRole);
    //   setIsLoggedIn(true);
    //   setUserRole(demoRole);
    // }
  }, []);

  // Scroll to top on page navigation for better UX
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Check if tutorial is active (user is in the middle of tutorial)
  useEffect(() => {
    const checkTutorialState = () => {
      const tutorialStep = localStorage.getItem('tutorialStep');
      const tutorialWaiting = localStorage.getItem('tutorialWaiting');

      if (tutorialStep !== null || tutorialWaiting === 'true') {
        setShowTutorial(true);
      } else {
        setShowTutorial(false);
      }
    };

    // Check on mount and path change
    checkTutorialState();

    // Listen for custom tutorial start event
    const handleTutorialStart = () => {
      checkTutorialState();
    };

    window.addEventListener('tutorialStart', handleTutorialStart);

    return () => {
      window.removeEventListener('tutorialStart', handleTutorialStart);
    };
  }, [location.pathname]); // Re-check on every page change

  const handleChatToggle = () => {
    setShowChatBot(!showChatBot);
  };

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('hasSeenTutorial', 'true');
  };

  // Show navbar on all pages when logged in (except login page)
  const showNavbar = isLoggedIn && location.pathname !== "/login";

  return (
    <div className="App">
      {showNavbar && (
        <TubelightNavbarDemo
          onChatToggle={handleChatToggle}
          userRole={userRole}
          setIsLoggedIn={setIsLoggedIn}
          setUserRole={setUserRole}
        />
      )}
      <Routes>
        <Route path="/login" element={<LoginPage setIsLoggedIn={setIsLoggedIn} setUserRole={setUserRole} />} />

        {/* User Routes - Only accessible by regular users */}
        <Route
          path="/"
          element={
            isLoggedIn ? (
              userRole === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <HomePage />
            ) : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/schemes"
          element={
            isLoggedIn ? (
              userRole === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <SchemesPage />
            ) : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/documents"
          element={
            isLoggedIn ? (
              userRole === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <DocumentsPage />
            ) : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/recommendations"
          element={
            isLoggedIn ? (
              userRole === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <InteractiveRecommendationsPage />
            ) : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/applications"
          element={
            isLoggedIn ? (
              userRole === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <ApplicationsPage />
            ) : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/scheme-tracking"
          element={
            isLoggedIn ? (
              userRole === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <SchemeTracking />
            ) : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/apply/:schemeId"
          element={
            isLoggedIn ? (
              userRole === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <ApplyPage />
            ) : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/track/:trackingId"
          element={<ApplicationTrackingPage />}
        />
        <Route
          path="/tracking"
          element={
            isLoggedIn ? (
              userRole === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <TrackingPage />
            ) : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/profile"
          element={
            isLoggedIn ? (
              userRole === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <ProfilePage />
            ) : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/feedback"
          element={
            isLoggedIn ? <FeedbackPage /> : <Navigate to="/login" replace />
          }
        />

        {/* Admin Routes - Only accessible by admin users */}
        <Route
          path="/admin/dashboard"
          element={
            isLoggedIn && userRole === 'admin' ? <AdminDashboard /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/admin/applications"
          element={
            isLoggedIn && userRole === 'admin' ? <AdminApplicationsPage /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/admin/applications/:id"
          element={
            isLoggedIn && userRole === 'admin' ? <AdminApplicationDetailsPage /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/admin/users"
          element={
            isLoggedIn && userRole === 'admin' ? <AdminUsersPage /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/admin/documents"
          element={
            isLoggedIn && userRole === 'admin' ? <AdminDocumentsPage /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/admin/application-review"
          element={
            isLoggedIn && userRole === 'admin' ? <ApplicationReviewPage /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/admin/scheme-approval"
          element={
            isLoggedIn && userRole === 'admin' ? <SchemeApprovalPage /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/admin/settings"
          element={
            isLoggedIn && userRole === 'admin' ? <AdminSettingsPage /> : <Navigate to="/login" replace />
          }
        />

        {/* Catch-all redirect for unauthorized access */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      {/* ChatBot available on all pages when logged in and not explicitly closed */}
      {isLoggedIn && location.pathname !== "/login" && showChatBot && (
        <SchemeChatBot onClose={() => setShowChatBot(false)} />
      )}
      {/* Tutorial available for regular users (not admins) */}
      {isLoggedIn && userRole !== 'admin' && location.pathname !== "/login" && (
        <Tutorial isOpen={showTutorial} onClose={handleCloseTutorial} />
      )}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;