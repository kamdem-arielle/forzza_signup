const Admin = require('../models/Admin');

/**
 * Admin Controller
 * Handles authentication logic for admin and superadmin users
 */

/**
 * Admin Signup (Registration)
 * Creates a new admin account
 */
exports.signup = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Check if username already exists
    const existingAdmin = await Admin.findByUsername(username);
    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Create new admin (default role is 'admin')
    // NOTE: In production, you should hash the password using bcrypt
    const adminRole = role === 'superadmin' ? 'superadmin' : 'admin';
    const result = await Admin.create(username, password, adminRole);

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      data: {
        id: result.insertId,
        username: username,
        role: adminRole
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating admin account',
      error: error.message
    });
  }
};

/**
 * Admin Login
 * Authenticates admin/superadmin user with username and password
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

    // Find admin by username
    const admin = await Admin.findByUsername(username);
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Verify password (simple comparison for now)
    // NOTE: In production, use bcrypt.compare() for hashed passwords
    if (admin.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Login successful - include role from database
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        id: admin.id,
        username: admin.username,
        role: admin.role || 'admin',
        created_at: admin.created_at
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: error.message
    });
  }
};

/**
 * Get All Admins
 * Returns list of all admins (for superadmin filter dropdowns)
 */
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.getAllAdmins();
    
    res.json({
      success: true,
      data: admins
    });

  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admins',
      error: error.message
    });
  }
};
