import React from 'react';
import PropTypes from 'prop-types';
import './UploadCard.css';

const UploadCard = ({
  status = 'uploading',
  progress = 0,
  title = '',
  description = '',
  primaryButtonText = '',
  onPrimaryButtonClick = () => {},
  secondaryButtonText = '',
  onSecondaryButtonClick = null,
}) => {

  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <div className="upload-card-icon uploading">
          <div className="spinner"></div>
        </div>;
      case 'success':
        return <div className="upload-card-icon success">✓</div>;
      case 'error':
        return <div className="upload-card-icon error">✕</div>;
      default:
        return null;
    }
  };

  return (
    <div className={`upload-card ${status}`}>
      <div className="upload-card-content">
        {getStatusIcon()}
        <h3 className="upload-card-title">{title}</h3>
        <p className="upload-card-description">{description}</p>
        
        {status === 'uploading' && (
          <div className="progress-bar">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            ></div>
          </div>
        )}
        
        <div className="upload-card-actions">
          {primaryButtonText && (
            <button 
              className={`btn ${status === 'error' ? 'btn-error' : 'btn-primary'}`}
              onClick={onPrimaryButtonClick}
            >
              {primaryButtonText}
            </button>
          )}
          
          {secondaryButtonText && (
            <button 
              className="btn btn-secondary"
              onClick={onSecondaryButtonClick}
            >
              {secondaryButtonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

UploadCard.propTypes = {
  status: PropTypes.oneOf(['uploading', 'success', 'error']),
  progress: PropTypes.number,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  primaryButtonText: PropTypes.string,
  onPrimaryButtonClick: PropTypes.func,
  secondaryButtonText: PropTypes.string,
  onSecondaryButtonClick: PropTypes.func,
};

export default UploadCard;
