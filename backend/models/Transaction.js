const pool = require('../config/db');

/**
 * Transaction Model
 * Handles all database operations for the transactions table
 * 
 * Table structure:
 * - id: INT PRIMARY KEY AUTO_INCREMENT
 * - transaction_datetime: DATETIME - Date and time of transaction
 * - channel: VARCHAR(255) - Channel/shop name
 * - username: VARCHAR(255) - Bettor's username
 * - booking: VARCHAR(255) - Transaction type (e.g., "Betting slip payment")
 * - amount: DECIMAL(15,2) - Transaction amount
 * - balance: DECIMAL(15,2) - User balance after transaction
 * - created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 */
class Transaction {
  
  /**
   * Create a new transaction
   * @param {object} data - Transaction data
   * @returns {Promise} Result of the insert operation
   */
  static async create(data) {
    try {
      const [result] = await pool.query(
        `INSERT INTO transactions (transaction_datetime, channel, username, booking, amount, balance) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [data.transactionDatetime, data.channel, data.username, data.booking, data.amount, data.balance]
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
        t.transactionDatetime,
        t.channel,
        t.username,
        t.booking,
        t.amount,
        t.balance
      ]);
      
      const [result] = await pool.query(
        'INSERT INTO transactions (transaction_datetime, channel, username, booking, amount, balance) VALUES ?',
        [values]
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all transactions with filters and agent info
   * @param {object} filters - Filter options (startDate, endDate, promoCode, channel, username)
   * @returns {Promise} Array of transaction records with agent info
   */
  static async getAll(filters = {}) {
    try {
      let query = `
        SELECT 
          t.id,
          t.transaction_datetime,
          t.channel,
          t.username,
          t.booking,
          t.amount,
          t.balance,
          t.created_at,
          s.promo_code,
          a.name AS agent_name,
          a.username AS agent_username
        FROM transactions t
        LEFT JOIN signups s ON t.username = s.username
        LEFT JOIN agents a ON s.promo_code = a.promo_code
        WHERE s.promo_code IS NOT NULL
      `;
      
      const params = [];
      
      if (filters.startDate) {
        query += ' AND DATE(t.transaction_datetime) >= ?';
        params.push(filters.startDate);
      }
      
      if (filters.endDate) {
        query += ' AND DATE(t.transaction_datetime) <= ?';
        params.push(filters.endDate);
      }
      
      if (filters.promoCode) {
        query += ' AND s.promo_code = ?';
        params.push(filters.promoCode);
      }

      if (filters.channel) {
        query += ' AND t.channel LIKE ?';
        params.push(`%${filters.channel}%`);
      }

      if (filters.username) {
        query += ' AND t.username LIKE ?';
        params.push(`%${filters.username}%`);
      }

      if (filters.booking) {
        if (filters.booking.toLowerCase() === 'deposit') {
          query += ' AND LOWER(t.booking) LIKE CONCAT(\'%\', LOWER(?), \'%\') AND LOWER(t.booking) NOT LIKE \'%casino games - deposit%\'';
        }else{
          query += ' AND LOWER(t.booking) LIKE CONCAT(\'%\', LOWER(?), \'%\')';
        }
        params.push(`%${filters.booking}%`);
      }
      
      query += ' ORDER BY t.transaction_datetime DESC, t.id DESC';
      
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
        LEFT JOIN signups s ON t.username = s.username
        LEFT JOIN agents a ON s.promo_code = a.promo_code
        WHERE 1=1
      `;
      
      const params = [];
      
      if (filters.startDate) {
        query += ' AND DATE(t.transaction_datetime) >= ?';
        params.push(filters.startDate);
      }
      
      if (filters.endDate) {
        query += ' AND DATE(t.transaction_datetime) <= ?';
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
   * @param {object} filters - Filter options (startDate, endDate, promoCode, channel, username)
   * @returns {Promise} Summary object
   */
  static async getSummary(filters = {}) {
    try {
      let query = `
        SELECT 
          COUNT(*) AS total_transactions,
          COALESCE(SUM(t.amount), 0) AS total_amount
        FROM transactions t
        LEFT JOIN signups s ON t.username = s.username
        WHERE 1=1
      `;
      
      const params = [];
      
      if (filters.startDate) {
        query += ' AND DATE(t.transaction_datetime) >= ?';
        params.push(filters.startDate);
      }
      
      if (filters.endDate) {
        query += ' AND DATE(t.transaction_datetime) <= ?';
        params.push(filters.endDate);
      }
      
      if (filters.promoCode) {
        query += ' AND s.promo_code = ?';
        params.push(filters.promoCode);
      }

      if (filters.channel) {
        query += ' AND t.channel LIKE ?';
        params.push(`%${filters.channel}%`);
      }

      if (filters.username) {
        query += ' AND t.username LIKE ?';
        params.push(`%${filters.username}%`);
      }
      
      const [rows] = await pool.query(query, params);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete transactions by date
   * @param {string} transactionDate - Date to delete transactions for (YYYY-MM-DD format)
   * @returns {Promise} Result of the delete operation
   */
  static async deleteByDate(transactionDate) {
    try {
      const [result] = await pool.query(
        'DELETE FROM transactions WHERE DATE(transaction_datetime) = ?',
        [transactionDate]
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete all transactions
   * @returns {Promise} Result of the delete operation
   */
  static async deleteAll() {
    try {
      const [result] = await pool.query('DELETE FROM transactions');
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get transactions by agent's promo code
   * @param {string} promoCode - Agent's promo code
   * @param {object} filters - Optional filters (startDate, endDate)
   * @returns {Promise} Array of transaction records
   */
  static async getByPromoCode(promoCode, filters = {}) {
    try {
      let query = `
        SELECT 
          t.id,
          t.transaction_datetime,
          t.channel,
          t.username,
          t.booking,
          t.amount,
          t.balance,
          t.created_at,
          s.username AS signup_username,
          s.phone AS signup_phone
        FROM transactions t
        INNER JOIN signups s ON t.username = s.username
        WHERE s.promo_code = ?
      `;
      
      const params = [promoCode];
      
      if (filters.startDate) {
        query += ' AND DATE(t.transaction_datetime) >= ?';
        params.push(filters.startDate);
      }
      
      if (filters.endDate) {
        query += ' AND DATE(t.transaction_datetime) <= ?';
        params.push(filters.endDate);
      }
      
      query += ' ORDER BY t.transaction_datetime DESC, t.id DESC';
      
      const [rows] = await pool.query(query, params);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get transaction summary for an agent by promo code
   * @param {string} promoCode - Agent's promo code
   * @returns {Promise} Summary object with count and total amount
   */
  static async getSummaryByPromoCode(promoCode) {
    try {
      const query = `
        SELECT 
          COUNT(*) AS total_transactions,
          COALESCE(SUM(t.amount), 0) AS total_amount
        FROM transactions t
        INNER JOIN signups s ON t.username = s.username
        WHERE s.promo_code = ?
      `;
      
      const [rows] = await pool.query(query, [promoCode]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get unique channels from transactions
   * @returns {Promise} Array of unique channel names
   */
  static async getUniqueChannels() {
    try {
      const [rows] = await pool.query('SELECT DISTINCT channel FROM transactions WHERE channel IS NOT NULL ORDER BY channel');
      return rows.map(row => row.channel);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get unique booking types from transactions
   * @returns {Promise} Array of unique booking types
   */
  static async getUniqueBookingTypes() {
    try {
      const [rows] = await pool.query('SELECT DISTINCT booking FROM transactions WHERE booking IS NOT NULL AND LOWER(booking) NOT LIKE \'%deposit%\' ORDER BY booking');
      return rows.map(row => row.booking);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all transactions with filters for a specific admin (via their agents' promo codes)
   * @param {object} filters - Filter options
   * @param {Array} promoCodes - Array of promo codes belonging to admin's agents
   * @returns {Promise} Array of transaction records with agent info
   */
  static async getAllByPromoCodes(filters = {}, promoCodes = []) {
    try {
      if (!promoCodes || promoCodes.length === 0) {
        return [];
      }
      
      const placeholders = promoCodes.map(() => '?').join(',');
      let query = `
        SELECT 
          t.id,
          t.transaction_datetime,
          t.channel,
          t.username,
          t.booking,
          t.amount,
          t.balance,
          t.created_at,
          s.promo_code,
          a.name AS agent_name,
          a.username AS agent_username
        FROM transactions t
        LEFT JOIN signups s ON t.username = s.username
        LEFT JOIN agents a ON s.promo_code = a.promo_code
        WHERE s.promo_code IN (${placeholders})
      `;
      
      const params = [...promoCodes];
      
      if (filters.startDate) {
        query += ' AND DATE(t.transaction_datetime) >= ?';
        params.push(filters.startDate);
      }
      
      if (filters.endDate) {
        query += ' AND DATE(t.transaction_datetime) <= ?';
        params.push(filters.endDate);
      }
      
      if (filters.promoCode) {
        query += ' AND s.promo_code = ?';
        params.push(filters.promoCode);
      }

      if (filters.channel) {
        query += ' AND t.channel LIKE ?';
        params.push(`%${filters.channel}%`);
      }

      if (filters.username) {
        query += ' AND t.username LIKE ?';
        params.push(`%${filters.username}%`);
      }

      if (filters.booking) {
        if (filters.booking.toLowerCase() === 'deposit') {
          query += ' AND LOWER(t.booking) LIKE CONCAT(\'%\', LOWER(?), \'%\') AND LOWER(t.booking) NOT LIKE \'%casino games - deposit%\'';
        } else {
          query += ' AND LOWER(t.booking) LIKE CONCAT(\'%\', LOWER(?), \'%\')';
        }
        params.push(`%${filters.booking}%`);
      }
      
      query += ' ORDER BY t.transaction_datetime DESC, t.id DESC';
      
      const [rows] = await pool.query(query, params);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get transaction statistics grouped by agent for a specific admin
   * @param {object} filters - Filter options (startDate, endDate)
   * @param {Array} promoCodes - Array of promo codes belonging to admin's agents
   * @returns {Promise} Array of agent stats
   */
  static async getStatsByAgentForAdmin(filters = {}, promoCodes = []) {
    try {
      if (!promoCodes || promoCodes.length === 0) {
        return [];
      }
      
      const placeholders = promoCodes.map(() => '?').join(',');
      let query = `
        SELECT 
          s.promo_code,
          a.name AS agent_name,
          COUNT(*) AS transaction_count,
          SUM(t.amount) AS total_amount
        FROM transactions t
        LEFT JOIN signups s ON t.username = s.username
        LEFT JOIN agents a ON s.promo_code = a.promo_code
        WHERE s.promo_code IN (${placeholders})
      `;
      
      const params = [...promoCodes];
      
      if (filters.startDate) {
        query += ' AND DATE(t.transaction_datetime) >= ?';
        params.push(filters.startDate);
      }
      
      if (filters.endDate) {
        query += ' AND DATE(t.transaction_datetime) <= ?';
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
   * Get total transactions summary for a specific admin
   * @param {object} filters - Filter options
   * @param {Array} promoCodes - Array of promo codes belonging to admin's agents
   * @returns {Promise} Summary object
   */
  static async getSummaryByPromoCodes(filters = {}, promoCodes = []) {
    try {
      if (!promoCodes || promoCodes.length === 0) {
        return { total_transactions: 0, total_amount: 0 };
      }
      
      const placeholders = promoCodes.map(() => '?').join(',');
      let query = `
        SELECT 
          COUNT(*) AS total_transactions,
          COALESCE(SUM(t.amount), 0) AS total_amount
        FROM transactions t
        LEFT JOIN signups s ON t.username = s.username
        WHERE s.promo_code IN (${placeholders})
      `;
      
      const params = [...promoCodes];
      
      if (filters.startDate) {
        query += ' AND DATE(t.transaction_datetime) >= ?';
        params.push(filters.startDate);
      }
      
      if (filters.endDate) {
        query += ' AND DATE(t.transaction_datetime) <= ?';
        params.push(filters.endDate);
      }
      
      if (filters.promoCode) {
        query += ' AND s.promo_code = ?';
        params.push(filters.promoCode);
      }

      if (filters.channel) {
        query += ' AND t.channel LIKE ?';
        params.push(`%${filters.channel}%`);
      }

      if (filters.username) {
        query += ' AND t.username LIKE ?';
        params.push(`%${filters.username}%`);
      }

      if (filters.booking) {
        if (filters.booking.toLowerCase() === 'deposit') {
          query += ' AND LOWER(t.booking) LIKE CONCAT(\'%\', LOWER(?), \'%\') AND LOWER(t.booking) NOT LIKE \'%casino games - deposit%\'';
        } else {
          query += ' AND LOWER(t.booking) LIKE CONCAT(\'%\', LOWER(?), \'%\')';
        }
        params.push(`%${filters.booking}%`);
      }
      
      const [rows] = await pool.query(query, params);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get filter options for a specific admin's transactions
   * @param {Array} promoCodes - Array of promo codes belonging to admin's agents
   * @returns {Promise} Object with channels and booking types
   */
  static async getFilterOptionsByPromoCodes(promoCodes = []) {
    try {
      if (!promoCodes || promoCodes.length === 0) {
        return { channels: [], bookingTypes: [] };
      }
      
      const placeholders = promoCodes.map(() => '?').join(',');
      
      const [channelRows] = await pool.query(
        `SELECT DISTINCT t.channel 
         FROM transactions t
         LEFT JOIN signups s ON t.username = s.username
         WHERE s.promo_code IN (${placeholders}) AND t.channel IS NOT NULL 
         ORDER BY t.channel`,
        promoCodes
      );
      
      const [bookingRows] = await pool.query(
        `SELECT DISTINCT t.booking 
         FROM transactions t
         LEFT JOIN signups s ON t.username = s.username
         WHERE s.promo_code IN (${placeholders}) AND t.booking IS NOT NULL AND LOWER(t.booking) NOT LIKE '%deposit%'
         ORDER BY t.booking`,
        promoCodes
      );
      
      return {
        channels: channelRows.map(row => row.channel),
        bookingTypes: bookingRows.map(row => row.booking)
      };
    } catch (error) {
      throw error;
    }
  }
}



module.exports = Transaction;
