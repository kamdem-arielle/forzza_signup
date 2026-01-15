const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');

/**
 * Agent Routes
 * Base path: /api/agents
 */

// Agent login (authenticate)
// POST /api/agents/login
router.post('/login', agentController.login);

// Get agent's signups by promo code
// GET /api/agents/:promo_code/signups
router.get('/:promo_code/signups', agentController.getMySignups);

// Get agent's signups by promo code and status
// GET /api/agents/:promo_code/signups/status/:status
router.get('/:promo_code/signups/status/:status', agentController.getMySignupsByStatus);

// Get agent's stats
// GET /api/agents/:promo_code/stats
router.get('/:promo_code/stats', agentController.getMyStats);

// Get agent's transactions
// GET /api/agents/:promo_code/transactions
router.get('/:promo_code/transactions', agentController.getMyTransactions);

// Get agent's transaction stats
// GET /api/agents/:promo_code/transactions/stats
router.get('/:promo_code/transactions/stats', agentController.getMyTransactionStats);

// Admin routes for managing agents
// Create new agent (Admin only)
// POST /api/agents
router.post('/', agentController.createAgent);

// Get all agents (SuperAdmin only - returns ALL agents)
// GET /api/agents
router.get('/', agentController.getAllAgents);

// Get agents by admin ID (Admin only - returns only their agents)
// GET /api/agents/admin/:admin_id
router.get('/admin/:admin_id', agentController.getAgentsByAdminId);

// Update agent (Admin only)
// PUT /api/agents/:id
router.put('/:id', agentController.updateAgent);

module.exports = router;
