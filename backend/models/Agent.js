const pool = require('../config/db');

/**
 * Agent Model
 * Handles all database operations for the agents table
 */
class Agent {
  
  /**
   * Create a new agent
   * @param {string} username - Agent username
   * @param {string} password - Agent password
   * @param {string} promo_code - Agent's unique promo code
   * @param {string} name - Agent's full name
   * @param {string} phone - Agent's phone number
   * @param {string} email - Agent's email
   * @param {number} admin_id - ID of the admin this agent belongs to
   * @returns {Promise} Result of the insert operation
   */
  static async create(username, password, promo_code, name = null, phone = null, email = null, admin_id = null) {
    try {
      const [result] = await pool.query(
        `INSERT INTO agents (admin_id, username, password, promo_code, name, phone, email, status, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW())`,
        [admin_id, username, password, promo_code, name, phone, email]
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find agent by username
   * @param {string} username - Agent username
   * @returns {Promise} Agent record or null
   */
  static async findByUsername(username) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM agents WHERE username = ?',
        [username]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find agent by promo code
   * @param {string} promo_code - Agent's promo code
   * @returns {Promise} Agent record or null
   */
  static async findByPromoCode(promo_code) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM agents WHERE promo_code = ?',
        [promo_code]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find agent by ID
   * @param {number} id - Agent ID
   * @returns {Promise} Agent record or null
   */
  static async findById(id) {
    try {
      const [rows] = await pool.query(
        'SELECT id, admin_id, username, promo_code, name, phone, email, status, created_at, last_login_at FROM agents WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all agents
   * @returns {Promise} Array of agents
   */
  static async getAll() {
    try {
      // Get all agents with registration_count
      const [rows] = await pool.query(
        `SELECT a.id, a.admin_id, a.username, a.promo_code, a.name, a.phone, a.email, a.status, a.created_at, a.last_login_at, a.registration_count
         FROM agents a
         ORDER BY a.created_at DESC`
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all agents for a specific admin
   * @param {number} adminId - Admin ID
   * @returns {Promise} Array of agents belonging to the admin
   */
  static async getAllByAdminId(adminId) {
    try {
      const [rows] = await pool.query(
        `SELECT a.id, a.admin_id, a.username, a.promo_code, a.name, a.phone, a.email, a.status, a.created_at, a.last_login_at, a.registration_count
         FROM agents a
         WHERE a.admin_id = ?
         ORDER BY a.created_at DESC`,
        [adminId]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get promo codes for agents belonging to a specific admin
   * @param {number} adminId - Admin ID
   * @returns {Promise} Array of promo codes
   */
  static async getPromoCodesByAdminId(adminId) {
    try {
      const [rows] = await pool.query(
        'SELECT promo_code FROM agents WHERE admin_id = ? AND promo_code IS NOT NULL',
        [adminId]
      );
      return rows.map(r => r.promo_code);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update registration_count for all agents
   * @returns {Promise} Result of the update operation
   */
  static async updateAllRegistrationCounts() {
    try {
      // Update registration_count for each agent based on signups table
      await pool.query(
        `UPDATE agents a
         LEFT JOIN (
           SELECT promo_code, COUNT(*) as reg_count
           FROM signups
           GROUP BY promo_code
         ) s ON a.promo_code = s.promo_code
         SET a.registration_count = IFNULL(s.reg_count, 0)`
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update agent's last login time
   * @param {number} id - Agent ID
   * @returns {Promise} Result of the update operation
   */
  static async updateLastLogin(id) {
    try {
      const [result] = await pool.query(
        'UPDATE agents SET last_login_at = NOW() WHERE id = ?',
        [id]
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update agent status
   * @param {number} id - Agent ID
   * @param {string} status - New status (active, suspended, inactive)
   * @returns {Promise} Result of the update operation
   */
  static async updateStatus(id, status) {
    try {
      const [result] = await pool.query(
        'UPDATE agents SET status = ? WHERE id = ?',
        [status, id]
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update agent details
   * @param {number} id - Agent ID
   * @param {object} data - Fields to update
   * @returns {Promise} Result of the update operation
   */
  static async update(id, data) {
    try {
      const { name, phone, email, status } = data;
      const [result] = await pool.query(
        'UPDATE agents SET name = ?, phone = ?, email = ?, status = ? WHERE id = ?',
        [name, phone, email, status, id]
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if username exists in both admin and agents tables
   * @param {string} username - Username to check
   * @returns {Promise<boolean>} True if username exists
   */
  static async usernameExists(username) {
    try {
      // Check agents table
      const [agentRows] = await pool.query(
        'SELECT id FROM agents WHERE username = ?',
        [username]
      );
      if (agentRows.length > 0) return true;

      // Check admins table
      const [adminRows] = await pool.query(
        'SELECT id FROM admins WHERE username = ?',
        [username]
      );
      return adminRows.length > 0;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if promo code exists
   * @param {string} promo_code - Promo code to check
   * @returns {Promise<boolean>} True if promo code exists
   */
  static async promoCodeExists(promo_code) {
    try {
      const [rows] = await pool.query(
        'SELECT id FROM agents WHERE promo_code = ?',
        [promo_code]
      );
      return rows.length > 0;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Agent;
