exports.notFound = (req, res) => res.status(404).json({ error: 'not_found' });
// Never leaks stack traces or internal messages to the browser; details go to the server log only.
exports.errorHandler = (err, req, res, next) => { // eslint-disable-line
  if (err && err.code === 11000) return res.status(409).json({ error: 'duplicate', message: 'A record with that unique value already exists.' });
  if (err && err.name === 'ValidationError') return res.status(400).json({ error: 'validation', message: err.message });
  if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'bad_json' });
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  res.status(500).json({ error: 'server_error', message: 'Something went wrong. Please try again.' });
};
