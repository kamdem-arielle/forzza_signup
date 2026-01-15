const SuperAdmin = require('../models/SuperAdmin');

/**
 * SuperAdmin Controller
 * Handles authentication and data retrieval for superadmin users
 * SuperAdmin has access to ALL data across all admins
 */

/**
 * SuperAdmin Signup (Registration)
 * Creates a new superadmin account
 */
exports.signup = async (req, res) => {
  try {
    const { username, password, name, email } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Check if username already exists
    const existingSuperAdmin = await SuperAdmin.findByUsername(username);
    if (existingSuperAdmin) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Create new superadmin
    // NOTE: In production, you should hash the password using bcrypt
    const result = await SuperAdmin.create(username, password, name, email);

    res.status(201).json({
      success: true,
      message: 'SuperAdmin account created successfully',
      data: {
        id: result.insertId,
        username: username
      }
    });

  } catch (error) {
    console.error('SuperAdmin signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating superadmin account',
      error: error.message
    });
  }
};

/**
 * SuperAdmin Login
 * Authenticates superadmin user with username and password
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Find superadmin by username
    const superadmin = await SuperAdmin.findByUsername(username);
    
    if (!superadmin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Verify password (simple comparison for now)
    // NOTE: In production, use bcrypt.compare() for hashed passwords
    if (superadmin.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Update last login time
    await SuperAdmin.updateLastLogin(superadmin.id);

    // Login successful
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        id: superadmin.id,
        username: superadmin.username,
        name: superadmin.name,
        email: superadmin.email,
        role: 'superadmin',
        created_at: superadmin.created_at
      }
    });

  } catch (error) {
    console.error('SuperAdmin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: error.message
    });
  }
};
