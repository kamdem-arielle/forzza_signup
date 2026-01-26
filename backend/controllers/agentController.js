const Agent = require('../models/Agent');
const Signup = require('../models/Signup');
const Transaction = require('../models/Transaction');
const QRCode = require('qrcode');

/**
 * Agent Controller
 * Handles authentication and data retrieval for agents
 */

/**
 * Agent Login
 * Authenticates agent with username and password
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

    // Find agent by username
    const agent = await Agent.findByUsername(username);
    
    if (!agent) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Check if agent is active
    if (agent.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Your account is suspended or inactive. Please contact admin.'
      });
    }

    // Verify password (simple comparison for now)
    // NOTE: In production, use bcrypt.compare() for hashed passwords
    if (agent.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Update last login time
    await Agent.updateLastLogin(agent.id);

    // Login successful
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        id: agent.id,
        username: agent.username,
        promo_code: agent.promo_code,
        name: agent.name,
        phone: agent.phone,
        email: agent.email,
        status: agent.status,
        created_at: agent.created_at
      }
    });

  } catch (error) {
    console.error('Agent login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: error.message
    });
  }
};

/**
 * Get Agent's Own Signups
 * Returns all signups associated with the agent's promo code
 */
exports.getMySignups = async (req, res) => {
  try {
    const { promo_code } = req.params;

    if (!promo_code) {
      return res.status(400).json({
        success: false,
        message: 'Promo code is required'
      });
    }

    // Verify the agent exists with this promo code
    const agent = await Agent.findByPromoCode(promo_code);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Get all signups for this promo code
    const signups = await Signup.getByPromoCode(promo_code);

    res.json({
      success: true,
      data: signups
    });

  } catch (error) {
    console.error('Get agent signups error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching signups',
      error: error.message
    });
  }
};

/**
 * Get Agent's Signups by Status
 * Returns signups filtered by status for a specific agent
 */
exports.getMySignupsByStatus = async (req, res) => {
  try {
    const { promo_code, status } = req.params;

    if (!promo_code) {
      return res.status(400).json({
        success: false,
        message: 'Promo code is required'
      });
    }

    // Validate status
    if (!['PENDING', 'APPROVED', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be PENDING, APPROVED, or ARCHIVED'
      });
    }

    // Verify the agent exists with this promo code
    const agent = await Agent.findByPromoCode(promo_code);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Get signups for this promo code filtered by status
    const signups = await Signup.getByPromoCodeAndStatus(promo_code, status);

    res.json({
      success: true,
      data: signups
    });

  } catch (error) {
    console.error('Get agent signups by status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching signups',
      error: error.message
    });
  }
};

/**
 * Get Agent's Stats
 * Returns statistics for the agent's signups
 */
exports.getMyStats = async (req, res) => {
  try {
    const { promo_code } = req.params;

    if (!promo_code) {
      return res.status(400).json({
        success: false,
        message: 'Promo code is required'
      });
    }

    // Verify the agent exists with this promo code
    const agent = await Agent.findByPromoCode(promo_code);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Get stats
    const stats = await Signup.getStatsByPromoCode(promo_code);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get agent stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stats',
      error: error.message
    });
  }
};

/**
 * Create a new agent (Admin only)
 * Request fields: surname (required), lastname (required), phone (required), city (required), email (optional), admin_id (optional)
 */
exports.createAgent = async (req, res) => {
  try {
    const { surname, lastname, phone, city, email, admin_id } = req.body;

    // Validate required fields
    if (!surname || !lastname || !phone || !city) {
      return res.status(400).json({
        success: false,
        message: 'Surname, lastname, phone, and city are required'
      });
    }

    // Check if phone already exists
    const phoneExists = await Agent.phoneExists(phone);
    if (phoneExists) {
      return res.status(409).json({
        success: false,
        message: 'Phone number already exists'
      });
    }

    // Generate name from surname + lastname
    const name = `${surname} ${lastname}`;

    // Get last 3 digits of phone
    const last3Digits = phone.slice(-3);

    // Generate promo code and username: FIRST 3 LETTERS OF SURNAME (UPPERCASE) + LAST 3 DIGITS OF PHONE
    const surnamePrefix = surname.substring(0, 3).toUpperCase();
    const promo_code = `${surnamePrefix}${last3Digits}`;
    const username = promo_code;

    // Check if username already exists
    const usernameExists = await Agent.usernameExists(username);
    if (usernameExists) {
      return res.status(409).json({
        success: false,
        message: 'Generated username already exists. Please try with a different surname or phone number.'
      });
    }

    // Check if promo code already exists
    const promoCodeExists = await Agent.promoCodeExists(promo_code);
    if (promoCodeExists) {
      return res.status(409).json({
        success: false,
        message: 'Generated promo code already exists. Please try with a different surname or phone number.'
      });
    }

    // Generate password: password + last 3 digits of phone
    const password = `password${last3Digits}`;

    // Generate agent URL
    const agent_url = `https://forzza.laureal.io/register?promo_code=${promo_code}`;

    // Generate QR code as Base64 PNG from the full agent URL (not just promo code)
    const qr_code = await QRCode.toDataURL(agent_url, {
      type: 'image/png',
      width: 300,
      margin: 2
    });

    // Create new agent with all fields
    const result = await Agent.create(
      username,
      password,
      promo_code,
      name,
      phone,
      email || null,
      admin_id || null,
      city,
      qr_code,
      agent_url
    );

    res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      data: {
        id: result.insertId,
        promo_code,
        agent_url,
        qr_code,
        name,
        phone,
        city
      }
    });

  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating agent',
      error: error.message
    });
  }
};

/**
 * Get all agents (SuperAdmin only - returns ALL agents)
 */
exports.getAllAgents = async (req, res) => {
  try {
    // Update registration_count for all agents before fetching
    await Agent.updateAllRegistrationCounts();
    const agents = await Agent.getAll();

    res.json({
      success: true,
      data: agents
    });

  } catch (error) {
    console.error('Get all agents error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching agents',
      error: error.message
    });
  }
};

/**
 * Get agents by admin ID (Admin only - returns only their agents)
 */
exports.getAgentsByAdminId = async (req, res) => {
  try {
    const { admin_id } = req.params;

    if (!admin_id) {
      return res.status(400).json({
        success: false,
        message: 'Admin ID is required'
      });
    }

    // Update registration_count for all agents before fetching
    await Agent.updateAllRegistrationCounts();
    const agents = await Agent.getAllByAdminId(admin_id);

    res.json({
      success: true,
      data: agents
    });

  } catch (error) {
    console.error('Get agents by admin ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching agents',
      error: error.message
    });
  }
};

/**
 * Update agent (Admin only)
 */
exports.updateAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, city, status } = req.body;

    // Check if agent exists
    const agent = await Agent.findById(id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Update agent
    await Agent.update(id, { name, phone, email, city, status });

    // Fetch updated agent
    const updatedAgent = await Agent.findById(id);

    res.json({
      success: true,
      message: 'Agent updated successfully',
      data: updatedAgent
    });

  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating agent',
      error: error.message
    });
  }
};

/**
 * Get Agent's Transactions
 * Returns all transactions made by signups associated with the agent's promo code
 */
exports.getMyTransactions = async (req, res) => {
  try {
    const { promo_code } = req.params;
    const { startDate, endDate } = req.query;

    if (!promo_code) {
      return res.status(400).json({
        success: false,
        message: 'Promo code is required'
      });
    }

    // Verify the agent exists with this promo code
    const agent = await Agent.findByPromoCode(promo_code);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    // Get all transactions for this promo code
    const transactions = await Transaction.getByPromoCode(promo_code, filters);

    res.json({
      success: true,
      data: transactions
    });

  } catch (error) {
    console.error('Get agent transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transactions',
      error: error.message
    });
  }
};

/**
 * Get Agent's Transaction Stats
 * Returns transaction summary for the agent
 */
exports.getMyTransactionStats = async (req, res) => {
  try {
    const { promo_code } = req.params;

    if (!promo_code) {
      return res.status(400).json({
        success: false,
        message: 'Promo code is required'
      });
    }

    // Verify the agent exists with this promo code
    const agent = await Agent.findByPromoCode(promo_code);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Get transaction summary
    const summary = await Transaction.getSummaryByPromoCode(promo_code);

    res.json({
      success: true,
      data: {
        total_transactions: parseInt(summary.total_transactions) || 0,
        total_amount: parseFloat(summary.total_amount) || 0
      }
    });

  } catch (error) {
    console.error('Get agent transaction stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction stats',
      error: error.message
    });
  }
};
