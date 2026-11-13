// Loads server/.env when the dotenv package is installed. Hosting platforms usually set real environment variables instead.
try { require('dotenv').config(); } catch (e) { /* dotenv not installed: rely on the real environment */ }
module.exports = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || '',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  ownerApiKey: process.env.OWNER_API_KEY || '',
};
