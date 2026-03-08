import React from 'react';
import { Clock, Upload, AlertCircle, CheckCircle } from 'lucide-react';

const DocumentTips = ({ onUploadClick, onExpiryCheck }) => {
  const tips = [
    {
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      title: 'Digital Storage',
      description: 'Keep digital copies of all important documents for quick access during scheme applications.'
    },
    {
      icon: <Clock className="h-5 w-5 text-yellow-500" />,
      title: 'Regular Updates',
      description: 'Update expired documents like income certificates annually to maintain eligibility.'
    },
    {
      icon: <AlertCircle className="h-5 w-5 text-blue-500" />,
      title: 'Scheme-Specific',
      description: 'Check specific scheme requirements as some may need additional documents.'
    },
    {
      icon: <Upload className="h-5 w-5 text-purple-500" />,
      title: 'Early Preparation',
      description: 'Start document collection early as some certificates take time to process.'
    }
  ];

  return (
    <div>
      {/* Quick Tips */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-medium text-white mb-6 flex items-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6 text-yellow-300 mr-2" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
            Document Management Tips
          </h2>
          <div className="space-y-4">
            {tips.map((tip, index) => (
              <div key={index} className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-sm p-4 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    {tip.icon}
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-white">{tip.title}</h4>
                    <p className="mt-1 text-sm text-blue-100">{tip.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 text-center">
            <button
              onClick={onUploadClick}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-blue-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Document Now
            </button>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="space-y-3">
          <button className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <span className="text-sm font-medium text-gray-700">Download All Documents</span>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
              />
            </svg>
          </button>
          <button 
            onClick={onExpiryCheck}
            className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">Check Document Expiry</span>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentTips;
