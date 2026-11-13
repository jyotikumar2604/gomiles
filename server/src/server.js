const mongoose = require('mongoose');
const config = require('./config');
const app = require('./app');

async function main() {
  if (!config.mongoUri) { console.error('MONGODB_URI is missing. Copy server/.env.example to server/.env and fill it in.'); process.exit(1); }
  await mongoose.connect(config.mongoUri);
  console.log('MongoDB connected');
  if (!config.googleMapsApiKey) console.log('Note: GOOGLE_MAPS_API_KEY is empty, so route lookups report "not configured".');
  if (!config.ownerApiKey) console.log('Note: OWNER_API_KEY is empty, so /api/owner routes answer 503.');
  app.listen(config.port, () => console.log(`API listening on http://localhost:${config.port}`));
}
main().catch((e) => { console.error('Startup failed:', e.message); process.exit(1); });
