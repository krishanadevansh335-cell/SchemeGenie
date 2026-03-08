import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';
import './LoginPage.css';

const LoginPage = ({ setIsLoggedIn, setUserRole }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validatePassword = (password) => {
    if (password.length < 3 || password.length > 10) {
      return 'Password must be between 3 and 10 characters long';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check required fields
    if (!formData.email || !formData.password || (!isLogin && !formData.name)) {
      alert('Please fill all required fields');
      return;
    }

    // Validate password
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      alert(passwordError);
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { email, password } = formData;
        const response = await api.post('/login', {
          email: email.trim(),
          password
        });
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('role', response.data.role);
        setIsLoggedIn(true);
        setUserRole(response.data.role);
        navigate('/');
      } else {
        const { name, email, password } = formData;
        await api.post('/register', {
          name: name,
          email: email,
          password: password
        });
        alert('Registration successful! Please login.');
        setIsLogin(true);
        setFormData({ name: '', email: '', password: '' });
      }
    } catch (error) {
      const message = error.response?.data?.msg || error.message || 'An error occurred';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // Check if backend is available
      try {
        await api.get('/health');
      } catch (networkError) {
        console.log('Backend not available, using fallback mode');
        // Fallback to demo login if backend is not running
        const demoToken = "demo_token_12345";
        localStorage.setItem("token", demoToken);
        localStorage.setItem("role", "user");
        setIsLoggedIn(true);
        setUserRole("user");
        navigate('/');
        return;
      }

      // For demo purposes, we'll use a simplified approach
      // In production, you would implement proper Google OAuth flow
      const demoGoogleUser = {
        name: 'Demo User',
        email: 'demo@gmail.com'
      };

      // Try to register/login with demo credentials
      // Silently attempt registration - if user exists, that's fine
      try {
        await api.post('/register', {
          name: demoGoogleUser.name,
          email: demoGoogleUser.email,
          password: 'demo123'
        });
        console.log('New user registered successfully');
      } catch (registerError) {
        // User might already exist, that's okay - we'll just login
        console.log('Registration skipped (user may already exist):', registerError.response?.data?.msg);
      }

      // Now login
      const response = await api.post('/login', {
        email: demoGoogleUser.email,
        password: 'demo123'
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', response.data.role);
      setIsLoggedIn(true);
      setUserRole(response.data.role);
      navigate('/');
    } catch (error) {
      console.error('Google login error:', error);

      // If network error, fallback to demo mode
      if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED') {
        const demoToken = "demo_token_12345";
        localStorage.setItem("token", demoToken);
        localStorage.setItem("role", "user");
        setIsLoggedIn(true);
        setUserRole("user");
        navigate('/');
        return;
      }

      alert('Google login failed. Please try regular login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>🧞‍♂️ SCHEME GENIE</h1>
          <p>Your magical gateway to government schemes</p>
        </div>

        <div className="login-form-container">
          <div className="form-toggle">
            <button
              className={isLogin ? 'active' : ''}
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
            <button
              className={!isLogin ? 'active' : ''}
              onClick={() => setIsLogin(false)}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {!isLogin && (
              <div className="form-group">
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group password-group">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "👁" : "🔒"}
              </button>
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
            </button>
          </form>

          <div className="divider">
            <button
              type="button"
              className="google-btn"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <span className="google-icon">🔍</span>
              {loading ? '⏳ Logging in...' : '✨ Continue with Google (Demo)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;