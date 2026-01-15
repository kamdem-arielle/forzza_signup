const pool = require('../config/db');

/**
 * SuperAdmin Model
 * Handles all database operations for the superadmins table
 * SuperAdmin has access to ALL data across all admins
 */
class SuperAdmin {
  
  /**
   * Create a new superadmin user
   * @param {string} username - SuperAdmin username
   * @param {string} password - SuperAdmin password (should be hashed in production)
   * @param {string} name - SuperAdmin name
   * @param {string} email - SuperAdmin email
   * @returns {Promise} Result of the insert operation
   */
  static async create(username, password, name = null, email = null) {
    try {
      const [result] = await pool.query(
        'INSERT INTO superadmins (username, password, name, email, created_at) VALUES (?, ?, ?, ?, NOW())',
        [username, password, name, email]
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find superadmin by username
   * @param {string} username - SuperAdmin username
   * @returns {Promise} SuperAdmin record or null
   */
  static async findByUsername(username) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM superadmins WHERE username = ?',
        [username]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find superadmin by ID
   * @param {number} id - SuperAdmin ID
   * @returns {Promise} SuperAdmin record or null
   */
  static async findById(id) {
    try {
      const [rows] = await pool.query(
        'SELECT id, username, name, email, created_at, last_login_at FROM superadmins WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update superadmin's last login time
   * @param {number} id - SuperAdmin ID
   * @returns {Promise} Result of the update operation
   */
  static async updateLastLogin(id) {
    try {
      const [result] = await pool.query(
        'UPDATE superadmins SET last_login_at = NOW() WHERE id = ?',
        [id]
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all superadmins
   * @returns {Promise} Array of superadmins
   */
  static async getAll() {
    try {
      const [rows] = await pool.query(
        'SELECT id, username, name, email, created_at, last_login_at FROM superadmins ORDER BY created_at DESC'
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = SuperAdmin;
