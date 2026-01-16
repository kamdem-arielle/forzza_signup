const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

/**
 * Admin Authentication Routes
 * Base path: /api/admin
 */

// Admin signup (create new admin account)
// POST /api/admin/signup
router.post('/signup', adminController.signup);

// Admin login (authenticate) - works for both admin and superadmin
// POST /api/admin/login
router.post('/login', adminController.login);

// Get all admins (for superadmin filter dropdowns)
// GET /api/admin/list
router.get('/list', adminController.getAllAdmins);

module.exports = router;
