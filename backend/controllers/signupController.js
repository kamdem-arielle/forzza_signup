const Signup = require('../models/Signup');

/**
 * Signup Controller
 * Handles user registration and signup management
 */

/**
 * Create a new signup (User Registration)
 * Creates a pending signup in the system
 */
exports.createSignup = async (req, res) => {
  try {
    const { username, phone, password, promo_code, promoCode } = req.body;
    const promoCodeValue = promo_code ?? promoCode ?? null;

    // Validate input
    if (!username || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, phone, and password are required'
      });
    }

    // Check if phone number already exists
    const existingSignup = await Signup.findByPhone(phone);
    if (existingSignup) {
      return res.status(409).json({
        success: false,
        message: 'Phone number already registered'
      });
    }

    // Create new signup with PENDING status
    // NOTE: In production, hash the password using bcrypt
    const result = await Signup.create(username, phone, password, promoCodeValue);

    res.status(201).json({
      success: true,
      message: 'Signup created successfully with pending status',
      data: {
        id: result.insertId,
        username: username,
        phone: phone,
        promo_code: promoCodeValue,
        status: 'PENDING'
      }
    });

  } catch (error) {
    console.error('Create signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating signup',
      error: error.message
    });
  }
};

/**
 * Update signup status
 * Changes signup status between PENDING and APPROVED
 */
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!status || !['PENDING', 'APPROVED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either pending or approved'
      });
    }

    // Check if signup exists
    const signup = await Signup.findById(id);
    if (!signup) {
      return res.status(404).json({
        success: false,
        message: 'Signup not found'
      });
    }

    // Update status
    await Signup.updateStatus(id, status);

    // Fetch updated record
    const updatedSignup = await Signup.findById(id);

    res.json({
      success: true,
      message: `Signup status updated to ${status.toLowerCase()}`,
      data: updatedSignup
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating signup status',
      error: error.message
    });
  }
};

/**
 * Get signups by status
 * Fetches all signups filtered by status (PENDING or APPROVED)
 */
exports.getByStatus = async (req, res) => {
  try {
    const { status } = req.params;

    // Validate status
    if (!['PENDING', 'APPROVED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either pending or approved'
      });
    }

    // Fetch signups by status
    const signups = await Signup.getByStatus(status);

    res.json({
      success: true,
      message: `Retrieved ${signups.length} ${status.toLowerCase()} signups`,
      count: signups.length,
      data: signups
    });

  } catch (error) {
    console.error('Get signups error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching signups',
      error: error.message
    });
  }
};

/**
 * Get all signups
 * Fetches all signups regardless of status
 */
exports.getAllSignups = async (req, res) => {
  try {
    const signups = await Signup.getAll();

    res.json({
      success: true,
      message: `Retrieved ${signups.length} total signups`,
      count: signups.length,
      data: signups
    });

  } catch (error) {
    console.error('Get all signups error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching signups',
      error: error.message
    });
  }
};

/**
 * Get signup by ID
 * Fetches a single signup record by its ID
 */
exports.getSignupById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find signup by ID
    const signup = await Signup.findById(id);

    if (!signup) {
      return res.status(404).json({
        success: false,
        message: 'Signup not found'
      });
    }

    res.json({
      success: true,
      message: 'Signup retrieved successfully',
      data: signup
    });

  } catch (error) {
    console.error('Get signup by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching signup',
      error: error.message
    });
  }
};

/**
 * Update signup notes
 * Updates the notes field for a signup
 */
exports.updateNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    // Check if signup exists
    const signup = await Signup.findById(id);
    if (!signup) {
      return res.status(404).json({
        success: false,
        message: 'Signup not found'
      });
    }

    // Update notes
    await Signup.updateNotes(id, notes || '');

    // Fetch updated record
    const updatedSignup = await Signup.findById(id);

    res.json({
      success: true,
      message: 'Notes updated successfully',
      data: updatedSignup
    });

  } catch (error) {
    console.error('Update notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notes',
      error: error.message
    });
  }
};
