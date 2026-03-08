import { Bot, CheckCircle, ClipboardList, CreditCard, FileText, Home, LayoutDashboard, LogOut, MessageCircle, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import Notifications from './Notifications';
import ThemeToggle from './ThemeToggle';
import { NavBar } from "./ui/tubelight-navbar";

export default function TubelightNavbarDemo({ onChatToggle, userRole, setIsLoggedIn, setUserRole }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const handleLogout = () => {
    // Preserve tutorial completion state
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');

    // Clear authentication
    localStorage.removeItem('token');
    localStorage.removeItem('role');

    // Clear any active tutorial session
    localStorage.removeItem('tutorialStep');
    localStorage.removeItem('tutorialWaiting');

    // Restore tutorial completion state if it existed
    if (hasSeenTutorial) {
      localStorage.setItem('hasSeenTutorial', hasSeenTutorial);
    }

    setIsLoggedIn(false);
    setUserRole('user');
    navigate('/login');
  };

  // Build navigation items based on user role
  const navItems = [];

  if (userRole === 'admin') {
    // Admin navigation items
    navItems.push(
      {
        name: '📊 Dashboard',
        url: '/admin/dashboard',
        icon: LayoutDashboard,
        onClick: () => navigate('/admin/dashboard')
      },
      {
        name: '📋 Applications',
        url: '/admin/applications',
        icon: ClipboardList,
        onClick: () => navigate('/admin/applications')
      },
      {
        name: '📄 Documents',
        url: '/admin/documents',
        icon: FileText,
        onClick: () => navigate('/admin/documents')
      },
      {
        name: '✅ Approvals',
        url: '/admin/scheme-approval',
        icon: CheckCircle,
        onClick: () => navigate('/admin/scheme-approval')
      },
      {
        name: '👥 Users',
        url: '/admin/users',
        icon: Users,
        onClick: () => navigate('/admin/users')
      }
    );
  } else {
    // Regular user navigation items
    navItems.push(
      {
        name: t('nav.home', '🏠 Home'),
        url: '/',
        icon: Home,
        onClick: () => navigate('/')
      },
      {
        name: t('nav.browseSchemes', '📋 Schemes'),
        url: '/schemes',
        icon: FileText,
        onClick: () => navigate('/schemes')
      },
      {
        name: t('nav.applications', '📋 Applications'),
        url: '/applications',
        icon: CreditCard,
        onClick: () => navigate('/applications')
      },
      {
        name: t('nav.documents', '📄 Documents'),
        url: '/documents',
        icon: FileText,
        onClick: () => navigate('/documents')
      },
      {
        name: t('nav.recommendations', '💡 Recommendations'),
        url: '/recommendations',
        icon: MessageCircle,
        onClick: () => navigate('/recommendations')
      },
      {
        name: t('nav.feedback', '💬 Q&A / Feedback'),
        url: '/feedback',
        icon: MessageCircle,
        onClick: () => navigate('/feedback')
      },
      {
        name: t('nav.profile', '👤 Profile'),
        url: '/profile',
        icon: Users,
        onClick: () => navigate('/profile')
      }
    );
  }

  // Add chatbot toggle button (visible for non-admin users only)
  if (location.pathname !== '/login' && userRole !== 'admin') {
    navItems.push({
      name: '🤖 Chat Bot',
      url: '#',
      icon: Bot,
      onClick: () => onChatToggle && onChatToggle()
    });
  }

  // Add logout button for all logged-in users
  navItems.push({
    name: userRole === 'admin' ? '🚪 Logout (Admin)' : '🚪 Logout',
    url: '#',
    icon: LogOut,
    onClick: handleLogout
  });

  return <NavBar items={navItems} className="z-50">
    <div className="flex items-center gap-2">
      {/* Only show language switcher, theme toggle, and notifications for non-admin users */}
      {userRole !== 'admin' && (
        <>
          <LanguageSwitcher />
          <ThemeToggle />
          <Notifications />
        </>
      )}
    </div>
  </NavBar>;
}
