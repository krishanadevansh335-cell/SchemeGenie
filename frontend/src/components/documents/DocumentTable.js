import { AlertCircle, AlertTriangle, CheckCircle, Clock, Trash2, X } from 'lucide-react';

const DocumentTable = ({ documents, activeTab, setActiveTab, onDelete, onReport }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-500 mr-1" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500 mr-1" />;
      case 'rejected':
        return <X className="h-4 w-4 text-red-500 mr-1" />;
      case 'needs_review':
        return <AlertCircle className="h-4 w-4 text-orange-500 mr-1" />;
      default:
        return null;
    }
  };

  const getExpiryStatus = (doc) => {
    if (!doc.expiryDate) return null;

    const expiryDate = new Date(doc.expiryDate);
    const today = new Date();
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: 'Expired', class: 'bg-red-100 text-red-800' };
    } else if (diffDays <= 30) {
      return { text: `Expires in ${diffDays} days`, class: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { text: 'Valid', class: 'bg-green-100 text-green-800' };
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('available')}
            className={`${activeTab === 'available'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
          >
            Available Documents
          </button>
          <button
            onClick={() => setActiveTab('uploaded')}
            className={`${activeTab === 'uploaded'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
          >
            My Uploaded Documents
          </button>
        </nav>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Document
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expiry
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {documents.map((doc) => {
              const expiryStatus = getExpiryStatus(doc);

              return (
                <tr key={doc._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 mr-3">
                        {doc.icon || '📄'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{doc.name}</div>
                        <div className="text-sm text-gray-500">
                          {doc.uploadDate && `Uploaded: ${new Date(doc.uploadDate).toLocaleDateString()}`}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{doc.category || 'Other'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(doc.status || 'pending')}
                      <span className="text-sm">
                        {doc.status ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1) : 'Pending'}
                      </span>
                    </div>
                    {doc.adminRemarks && (
                      <div className="text-xs text-gray-500 mt-1" title={doc.adminRemarks}>
                        {doc.adminRemarks.length > 30
                          ? `${doc.adminRemarks.substring(0, 30)}...`
                          : doc.adminRemarks}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {expiryStatus ? (
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${expiryStatus.class}`}>
                        {expiryStatus.text}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          const url = doc.fileName
                            ? `http://localhost:5002/uploads/${doc.fileName}`
                            : (doc.fileUrl || `#${doc._id}`);
                          window.open(url, '_blank');
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Document"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onReport(doc._id, doc.name)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Report Issue"
                      >
                        <AlertTriangle className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => onDelete(doc._id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Document"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DocumentTable;
