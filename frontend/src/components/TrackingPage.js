import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TrackingPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/scheme-tracking');
  }, [navigate]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#0f172a',
      color: 'white'
    }}>
      Redirecting to Scheme Tracking...
    </div>
  );
};

export default TrackingPage;
