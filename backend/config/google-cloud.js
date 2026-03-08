// Google Cloud Vision API configuration
import { Storage } from '@google-cloud/storage';
import * as visionModule from '@google-cloud/vision';

let storage = null;
let visionClient = null;

// Check if Google Cloud credentials are available
const hasGoogleCredentials = () => {
  return !!(process.env.GOOGLE_CLOUD_PROJECT_ID && process.env.GOOGLE_APPLICATION_CREDENTIALS);
};

// Lazy initialization with error handling
function getStorage() {
  if (!storage && hasGoogleCredentials()) {
    try {
      storage = new Storage({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
      });
    } catch (error) {
      console.warn('⚠️ Google Cloud Storage not available:', error.message);
      storage = null;
    }
  }
  return storage;
}

function getVisionClient() {
  if (!visionClient && hasGoogleCredentials()) {
    try {
      visionClient = new visionModule.ImageAnnotatorClient({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
      });
    } catch (error) {
      console.warn('⚠️ Google Cloud Vision not available:', error.message);
      visionClient = null;
    }
  }
  return visionClient;
}

const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'scheme-seva-uploads';

// Export lazy-loaded clients
export { bucketName, getStorage as storage, getVisionClient as vision };

