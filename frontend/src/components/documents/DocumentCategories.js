import React from 'react';

const documentCategories = [
  { value: 'Identity', label: 'Identity', icon: '🆔' },
  { value: 'Income', label: 'Income', icon: '💰' },
  { value: 'Category', label: 'Category', icon: '🏛️' },
  { value: 'Banking', label: 'Banking', icon: '🏦' },
  { value: 'Address', label: 'Address', icon: '🏠' },
  { value: 'Education', label: 'Education', icon: '📚' },
  { value: 'Legal', label: 'Legal', icon: '⚖️' },
  { value: 'Other', label: 'Other', icon: '📄' }
];

const DocumentCategories = ({ onCategorySelect }) => {
  return (
    <div className="lg:col-span-2">
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6 text-blue-600 mr-2" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
              />
            </svg>
            Document Categories
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {documentCategories.map((cat) => (
              <div 
                key={cat.value} 
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center text-center group"
                onClick={() => onCategorySelect(cat.value)}
              >
                <div className="h-12 w-12 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 text-2xl mb-3 group-hover:bg-blue-100 transition-colors">
                  {cat.icon}
                </div>
                <h3 className="font-medium text-gray-900">{cat.label}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Click to upload a new {cat.label.toLowerCase()} document
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentCategories;
