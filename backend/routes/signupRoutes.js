const express = require('express');
const router = express.Router();
const signupController = require('../controllers/signupController');

/**
 * Signup Management Routes
 * Base path: /api/signups
 */

// Create a new signup (user registration)
// POST /api/signups
router.post('/', signupController.createSignup);

// Update signup status
// PUT /api/signups/:id/status
router.put('/:id/status', signupController.updateStatus);

// Update signup notes
// PATCH /api/signups/:id/notes
router.patch('/:id/notes', signupController.updateNotes);

// Get signups by status (SuperAdmin - all data)
// GET /api/signups/status/:status
router.get('/status/:status', signupController.getByStatus);

// Get signups by status for a specific admin
// GET /api/signups/admin/:admin_id/status/:status
router.get('/admin/:admin_id/status/:status', signupController.getByStatusAndAdminId);

// Get all signups for a specific admin
// GET /api/signups/admin/:admin_id
router.get('/admin/:admin_id', signupController.getSignupsByAdminId);

// Get signup by ID
// GET /api/signups/:id
router.get('/:id', signupController.getSignupById);

// Get all signups (SuperAdmin - all data)
// GET /api/signups
router.get('/', signupController.getAllSignups);

module.exports = router;
