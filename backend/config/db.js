import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB connection URL from environment variables or use default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/scheme-seva';

// Connect to MongoDB
export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    // Exit process with failure after a short delay to allow logs to be written
    setTimeout(() => process.exit(1), 1000);
    throw error; // Re-throw to allow handling in the calling code if needed
  }
};

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');});

// Close the Mongoose connection when the Node process ends
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Mongoose connection closed through app termination');
  process.exit(0);
});

export default mongoose;
