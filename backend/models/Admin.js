const pool = require('../config/db');

/**
 * Admin Model
 * Handles all database operations for the admin table
 * Supports both admin and superadmin roles
 */
class Admin {
  
  /**
   * Create a new admin user
   * @param {string} username - Admin username
   * @param {string} password - Admin password (should be hashed in production)
   * @param {string} role - Admin role ('admin' or 'superadmin')
   * @returns {Promise} Result of the insert operation
   */
  static async create(username, password, role = 'admin') {
    try {
      const [result] = await pool.query(
        'INSERT INTO admins (username, password, role, created_at) VALUES (?, ?, ?, NOW())',
        [username, password, role]
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
        'SELECT id, username, role, created_at FROM admins WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all admins (excluding superadmins) for dropdown filters
   * @returns {Promise} Array of admins
   */
  static async getAllAdmins() {
    try {
      const [rows] = await pool.query(
        'SELECT id, username, role, created_at FROM admins WHERE role = ? ORDER BY username ASC',
        ['admin']
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all users (admins and superadmins)
   * @returns {Promise} Array of all admin users
   */
  static async getAll() {
    try {
      const [rows] = await pool.query(
        'SELECT id, username, role, created_at FROM admins ORDER BY role DESC, username ASC'
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Admin;
