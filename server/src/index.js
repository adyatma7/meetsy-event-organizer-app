const express = require('express');
const cors = require('cors');
require('dotenv').config();

const adminRoutes = require('./routes/admin.routes');
const staffRoutes = require('./routes/staff.routes');
const publicRoutes = require('./routes/public.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------
// Middleware
// ---------------------
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---------------------
// Routes
// ---------------------
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/public', publicRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// ---------------------
// Error handling
// ---------------------
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  console.error(err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// ---------------------
// Start server
// ---------------------
app.listen(PORT, () => {
  console.log(`\n🚀 Meetsy API server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Email provider: ${process.env.EMAIL_PROVIDER || 'resend'}`);
  console.log(`   AI provider: ${process.env.AI_PROVIDER || 'ollama'}\n`);
});

module.exports = app;
