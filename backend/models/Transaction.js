const pool = require('../config/db');

/**
 * Transaction Model
 * Handles all database operations for the transactions table
 */
class Transaction {
  
  /**
   * Create a new transaction
   * @param {string} bettorName - Bettor's name
   * @param {number} amount - Transaction amount
   * @param {string} promoCode - Agent's promo code
   * @param {string} transactionDate - Date of the transaction
   * @returns {Promise} Result of the insert operation
   */
  static async create(bettorName, amount, promoCode, transactionDate) {
    try {
      const [result] = await pool.query(
        'INSERT INTO transactions (bettor_name, amount, promo_code, transaction_date) VALUES (?, ?, ?, ?)',
        [bettorName, amount, promoCode, transactionDate]
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create multiple transactions in bulk
   * @param {Array} transactions - Array of transaction objects
   * @returns {Promise} Result of the bulk insert operation
   */
  static async bulkCreate(transactions) {
    try {
      if (transactions.length === 0) return { affectedRows: 0 };
      
      const values = transactions.map(t => [
        t.bettorName,
        t.amount,
        // t.promoCode,
        t.transactionDate
      ]);
      
      const [result] = await pool.query(
        'INSERT INTO transactions (bettor_name, amount, transaction_date) VALUES ?',
        [values]
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all transactions with filters and agent info
   * @param {object} filters - Filter options (startDate, endDate, promoCode)
   * @returns {Promise} Array of transaction records with agent info
   */
  static async getAll(filters = {}) {
    try {
      let query = `
        SELECT 
          t.id,
          t.bettor_name,
          t.amount,
          s.promo_code,
          t.transaction_date,
          t.created_at,
          a.name AS agent_name,
          a.username AS agent_username
        FROM transactions t
        LEFT JOIN signups s ON t.bettor_name = s.username
        LEFT JOIN agents a ON s.promo_code = a.promo_code
        WHERE s.promo_code IS NOT NULL
      `;
      
      const params = [];
      
      if (filters.startDate) {
        query += ' AND t.transaction_date >= ?';
        params.push(filters.startDate);
      }
      
      if (filters.endDate) {
        query += ' AND t.transaction_date <= ?';
        params.push(filters.endDate);
      }
      
      if (filters.promoCode) {
        query += ' AND s.promo_code = ?';
        params.push(filters.promoCode);
      }
      
      query += ' ORDER BY t.transaction_date DESC, t.id DESC';
      
      const [rows] = await pool.query(query, params);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get transaction statistics grouped by agent
   * @param {object} filters - Filter options (startDate, endDate)
   * @returns {Promise} Array of agent stats
   */
  static async getStatsByAgent(filters = {}) {
    try {
      let query = `
        SELECT 
          s.promo_code,
          a.name AS agent_name,
          COUNT(*) AS transaction_count,
          SUM(t.amount) AS total_amount
        FROM transactions t
        LEFT JOIN signups s ON t.bettor_name = s.username
        LEFT JOIN agents a ON s.promo_code = a.promo_code
        WHERE s.promo_code IS NOT NULL;

      `;
      
      const params = [];
      
      if (filters.startDate) {
        query += ' AND t.transaction_date >= ?';
        params.push(filters.startDate);
      }
      
      if (filters.endDate) {
        query += ' AND t.transaction_date <= ?';
        params.push(filters.endDate);
      }
      
      query += ' GROUP BY s.promo_code, a.name ORDER BY total_amount DESC';
      
      const [rows] = await pool.query(query, params);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get total transactions summary
   * @param {object} filters - Filter options (startDate, endDate, promoCode)
   * @returns {Promise} Summary object
   */
  static async getSummary(filters = {}) {
    try {
      let query = `
        SELECT 
          COUNT(*) AS total_transactions,
          COALESCE(SUM(t.amount), 0) AS total_amount
        FROM transactions t
        LEFT JOIN signups s ON t.bettor_name = s.username
        WHERE 1=1
      `;
      
      const params = [];
      
      if (filters.startDate) {
        query += ' AND t.transaction_date >= ?';
        params.push(filters.startDate);
      }
      
      if (filters.endDate) {
        query += ' AND t.transaction_date <= ?';
        params.push(filters.endDate);
      }
      
      if (filters.promoCode) {
        query += ' AND s.promo_code = ?';
        params.push(filters.promoCode);
      }
      
      const [rows] = await pool.query(query, params);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete transactions by date
   * @param {string} transactionDate - Date to delete transactions for
   * @returns {Promise} Result of the delete operation
   */
  static async deleteByDate(transactionDate) {
    try {
      const [result] = await pool.query(
        'DELETE FROM transactions WHERE transaction_date = ?',
        [transactionDate]
      );
      return result;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Transaction;
