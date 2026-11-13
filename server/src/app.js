const express = require('express');
const cors = require('cors');
const config = require('./config');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json({ limit: '50kb' }));
app.use('/api', require('./routes/public'));
app.use('/api/owner', require('./routes/owner'));
app.use(notFound);
app.use(errorHandler);
module.exports = app;
