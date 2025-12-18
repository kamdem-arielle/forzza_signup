const pool = require('../config/db');

/**
 * Signup Model
 * Handles all database operations for the signup table
 */
class Signup {
  
  /**
   * Create a new signup (user registration)
   * @param {string} username - User's username
   * @param {string} phone - User's phone number
   * @param {string} password - User's password
   * @param {string|null} promoCode - Optional promo code
   * @returns {Promise} Result of the insert operation
   */
  static async create(username, phone, password, promoCode = null) {
    try {
      const [result] = await pool.query(
        'INSERT INTO signups (username, phone, password, promo_code, status, created_at) VALUES (?, ?, ?, ?, "PENDING", NOW())',
        [username, phone, password, promoCode || null]
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update signup status
   * @param {number} id - Signup ID
   * @param {string} status - New status (PENDING or APPROVED)
   * @returns {Promise} Result of the update operation
   */
  static async updateStatus(id, status) {
    try {
      // If status is APPROVED, also set approved_at timestamp
      const query = status === 'APPROVED' 
        ? 'UPDATE signups SET status = ?, approved_at = NOW() WHERE id = ?'
        : 'UPDATE signups SET status = ?, approved_at = NULL WHERE id = ?';
      
      const [result] = await pool.query(query, [status, id]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Fetch signups by status
   * @param {string} status - Status to filter by (PENDING or APPROVED)
   * @returns {Promise} Array of signup records
   */
  static async getByStatus(status) {
    try {
      const [rows] = await pool.query(
        'SELECT id, username, phone, promo_code, password, status, created_at, approved_at FROM signups WHERE status = ? ORDER BY created_at DESC',
        [status]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all signups
   * @returns {Promise} Array of all signup records
   */
  static async getAll() {
    try {
      const [rows] = await pool.query(
        'SELECT id, username, phone, promo_code, password, status, created_at, approved_at FROM signups ORDER BY created_at DESC'
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find signup by ID
   * @param {number} id - Signup ID
   * @returns {Promise} Signup record or null
   */
  static async findById(id) {
    try {
      const [rows] = await pool.query(
        'SELECT id, username, phone, promo_code, password, status, created_at, approved_at FROM signups WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Signup;
