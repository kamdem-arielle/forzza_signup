const express = require('express');
const router = express.Router();

// Import route modules
const adminRoutes = require('./adminRoutes');
const signupRoutes = require('./signupRoutes');
const agentRoutes = require('./agentRoutes');

// Mount routes
router.use('/admin', adminRoutes);
router.use('/signups', signupRoutes);
router.use('/agents', agentRoutes);

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working!',
    endpoints: {
      admin: {
        signup: 'POST /api/admin/signup',
        login: 'POST /api/admin/login'
      },
      signups: {
        create: 'POST /api/signups',
        updateStatus: 'PUT /api/signups/:id/status',
        getByStatus: 'GET /api/signups/status/:status',
        getAll: 'GET /api/signups'
      },
      agents: {
        login: 'POST /api/agents/login',
        getSignups: 'GET /api/agents/:promo_code/signups',
        getSignupsByStatus: 'GET /api/agents/:promo_code/signups/status/:status',
        getStats: 'GET /api/agents/:promo_code/stats',
        create: 'POST /api/agents',
        getAll: 'GET /api/agents',
        update: 'PUT /api/agents/:id'
      }
    }
  });
});

module.exports = router;
