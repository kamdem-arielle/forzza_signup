const pool = require('../config/db');

/**
 * Admin Model
 * Handles all database operations for the admin table
 */
class Admin {
  
  /**
   * Create a new admin user
   * @param {string} username - Admin username
   * @param {string} password - Admin password (should be hashed in production)
   * @returns {Promise} Result of the insert operation
   */
  static async create(username, password) {
    try {
      const [result] = await pool.query(
        'INSERT INTO admins (username, password, created_at) VALUES (?, ?, NOW())',
        [username, password]
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find admin by username
   * @param {string} username - Admin username
   * @returns {Promise} Admin record or null
   */
  static async findByUsername(username) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM admins WHERE username = ?',
        [username]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find admin by ID
   * @param {number} id - Admin ID
   * @returns {Promise} Admin record or null
   */
  static async findById(id) {
    try {
      const [rows] = await pool.query(
        'SELECT id, username, created_at FROM admins WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Admin;
