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

// Get signups by status (PENDING or APPROVED)
// GET /api/signups/status/:status
router.get('/status/:status', signupController.getByStatus);

// Get signup by ID
// GET /api/signups/:id
router.get('/:id', signupController.getSignupById);

// Get all signups
// GET /api/signups
router.get('/', signupController.getAllSignups);

module.exports = router;
