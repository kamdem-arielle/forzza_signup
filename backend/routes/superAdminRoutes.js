const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');

/**
 * SuperAdmin Authentication Routes
 * Base path: /api/superadmin
 */

// SuperAdmin signup (create new superadmin account)
// POST /api/superadmin/signup
router.post('/signup', superAdminController.signup);

// SuperAdmin login (authenticate)
// POST /api/superadmin/login
router.post('/login', superAdminController.login);

module.exports = router;
