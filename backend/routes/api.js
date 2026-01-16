const express = require('express');
const router = express.Router();

// Import route modules
const adminRoutes = require('./adminRoutes');
const signupRoutes = require('./signupRoutes');
const agentRoutes = require('./agentRoutes');
const transactionRoutes = require('./transactionRoutes');

// Mount routes
router.use('/admin', adminRoutes);
router.use('/signups', signupRoutes);
router.use('/agents', agentRoutes);
router.use('/transactions', transactionRoutes);

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working!',
    endpoints: {
      admin: {
        signup: 'POST /api/admin/signup',
        login: 'POST /api/admin/login (works for both admin and superadmin)',
        list: 'GET /api/admin/list (get all admins for filter)'
      },
      signups: {
        create: 'POST /api/signups',
        updateStatus: 'PUT /api/signups/:id/status',
        getByStatus: 'GET /api/signups/status/:status',
        getByStatusAndAdmin: 'GET /api/signups/admin/:admin_id/status/:status',
        getByAdmin: 'GET /api/signups/admin/:admin_id',
        getAll: 'GET /api/signups'
      },
      agents: {
        login: 'POST /api/agents/login',
        getSignups: 'GET /api/agents/:promo_code/signups',
        getSignupsByStatus: 'GET /api/agents/:promo_code/signups/status/:status',
        getStats: 'GET /api/agents/:promo_code/stats',
        create: 'POST /api/agents',
        getAll: 'GET /api/agents',
        getByAdmin: 'GET /api/agents/admin/:admin_id',
        update: 'PUT /api/agents/:id'
      },
      transactions: {
        import: 'POST /api/transactions/import',
        getAll: 'GET /api/transactions',
        getByAdmin: 'GET /api/transactions/admin/:admin_id',
        getStats: 'GET /api/transactions/stats',
        getStatsByAdmin: 'GET /api/transactions/admin/:admin_id/stats',
        getFilterOptions: 'GET /api/transactions/filter-options',
        getFilterOptionsByAdmin: 'GET /api/transactions/admin/:admin_id/filter-options'
      }
    }
  });
});

module.exports = router;
