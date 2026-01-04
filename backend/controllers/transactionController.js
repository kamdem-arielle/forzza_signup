const Transaction = require('../models/Transaction');
const Agent = require('../models/Agent');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/octet-stream' // Some systems send this for xlsx
    ];
    const allowedExtensions = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * Transaction Controller
 * Handles Excel import and transaction data retrieval
 */

/**
 * Parse channel and username from the channel/user column
 * Format: "KYZ shop1 / Mama697478343 (x x)"
 * @param {string} channelUserStr - The channel/user string
 * @returns {object} Object with channel and username
 */
function parseChannelUser(channelUserStr) {
  if (!channelUserStr || typeof channelUserStr !== 'string') {
    return { channel: null, username: null };
  }

  // Split by " / " to separate channel from user part
  const parts = channelUserStr.split('/');
  
  if (parts.length < 2) {
    return { channel: channelUserStr.trim(), username: null };
  }

  const channel = parts[0].trim();
  let userPart = parts.slice(1).join('/').trim(); // Join back in case username contains /

  // Extract username before the parentheses (x x)
  // Pattern: username (x x) or just username
  const parenMatch = userPart.match(/^(.+?)\s*\([^)]*\)\s*$/);
  
  let username;
  if (parenMatch) {
    username = parenMatch[1].trim();
  } else {
    username = userPart.trim();
  }

  // Remove any trailing whitespace from username
  username = username.replace(/\s+$/, '');

  return { channel, username };
}

/**
 * Parse amount string to number
 * Format: "-229,00 XAF" or "1.000,50 XAF" (dot is thousand separator, comma is decimal)
 * @param {string|number} amountStr - The amount string
 * @returns {number} Parsed amount
 */
function parseAmount(amountStr) {
  if (typeof amountStr === 'number') {
    return amountStr;
  }
  
  if (!amountStr || typeof amountStr !== 'string') {
    return 0;
  }

  // Remove XAF and trim
  let cleaned = amountStr.replace(/XAF/gi, '').trim();
  
  // Remove spaces (some formats use space as thousand separator)
  cleaned = cleaned.replace(/\s/g, '');
  
  // Remove dots (thousand separators)
  cleaned = cleaned.replace(/\./g, '');
  
  // Replace comma with dot for decimal
  cleaned = cleaned.replace(',', '.');
  
  return parseFloat(cleaned) || 0;
}

/**
 * Parse date/time string to MySQL datetime format
 * Format: "20.12.2025 00:56:08" -> "2025-12-20 00:56:08"
 * @param {string|Date|number} dateTimeStr - The date/time string or Excel serial number
 * @returns {string} MySQL datetime format
 */
function parseDatetime(dateTimeStr) {
  // Handle Excel serial date numbers
  if (typeof dateTimeStr === 'number') {
    // Excel dates are days since 1900-01-01 (with a bug for 1900 leap year)
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + dateTimeStr * 24 * 60 * 60 * 1000);
    return formatMySQLDatetime(date);
  }
  
  if (dateTimeStr instanceof Date) {
    return formatMySQLDatetime(dateTimeStr);
  }
  
  if (!dateTimeStr || typeof dateTimeStr !== 'string') {
    return null;
  }

  // Parse format "DD.MM.YYYY HH:MM:SS"
  const match = dateTimeStr.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
  
  if (match) {
    const [, day, month, year, hour, minute, second] = match;
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }
  
  // Try other common formats
  const date = new Date(dateTimeStr);
  if (!isNaN(date.getTime())) {
    return formatMySQLDatetime(date);
  }
  
  return null;
}

/**
 * Format Date object to MySQL datetime string
 * @param {Date} date - Date object
 * @returns {string} MySQL datetime format
 */
function formatMySQLDatetime(date) {
  const pad = (n) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Check if a row is a summary row (totals at the end)
 * @param {object} row - The row data
 * @returns {boolean} True if it's a summary row
 */
function isSummaryRow(row) {
  const values = Object.values(row);
  const rowStr = values.join(' ').toLowerCase();
  
  // Check for common summary indicators
  const summaryKeywords = ['total', 'sum', 'summary', 'somme', 'gesamt', 'итого'];
  
  for (const keyword of summaryKeywords) {
    if (rowStr.includes(keyword)) {
      return true;
    }
  }
  
  // Check if the row has mostly empty values (common for separator rows)
  const emptyCount = values.filter(v => v === null || v === undefined || v === '').length;
  if (emptyCount >= values.length - 1) {
    return true;
  }
  
  return false;
}

/**
 * Import transactions from Excel
 * POST /api/transactions/import
 */
exports.importExcel = [
  upload.single('excelFile'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Excel file is required'
        });
      }

      // Parse Excel file
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON - each row will be an array
      const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });
      
      if (rawData.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Excel file is empty'
        });
      }

      const transactions = [];
      const errors = [];

      // Process each row (assuming no header row based on sample data)
      // Columns: DateTime, Channel/User, Booking, Amount, Balance
      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        
        // Skip empty rows
        if (!row || row.length === 0 || row.every(cell => cell === null || cell === '')) {
          continue;
        }

        // Check if this is a summary row (skip it)
        const rowObj = {
          datetime: row[0],
          channelUser: row[1],
          booking: row[2],
          amount: row[3],
          balance: row[4]
        };
        
        if (isSummaryRow(rowObj)) {
          continue;
        }

        // Parse the data
        const transactionDatetime = parseDatetime(row[0]);
        const { channel, username } = parseChannelUser(row[1]);
        const booking = row[2] ? String(row[2]).trim() : null;
        const amount = parseAmount(row[3]);
        const balance = parseAmount(row[4]);

        // Validate required fields
        if (!transactionDatetime) {
          errors.push(`Row ${i + 1}: Invalid or missing date/time`);
          continue;
        }

        if (!username) {
          errors.push(`Row ${i + 1}: Could not extract username from "${row[1]}"`);
          continue;
        }

        transactions.push({
          transactionDatetime,
          channel,
          username,
          booking,
          amount,
          balance
        });
      }

      if (transactions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid transactions found in the Excel file',
          errors: errors.slice(0, 10) // Return first 10 errors
        });
      }

      // Insert transactions into database
      const result = await Transaction.bulkCreate(transactions);

      res.json({
        success: true,
        message: `Successfully imported ${result.affectedRows} transactions`,
        data: {
          importedCount: result.affectedRows,
          totalRows: rawData.length,
          skippedRows: rawData.length - transactions.length,
          errors: errors.slice(0, 10) // Return first 10 errors for debugging
        }
      });

    } catch (error) {
      console.error('Import Excel error:', error);
      res.status(500).json({
        success: false,
        message: 'Error importing Excel file',
        error: error.message
      });
    }
  }
];

/**
 * Get all transactions with filters
 * GET /api/transactions
 */
exports.getTransactions = async (req, res) => {
  try {
    const { startDate, endDate, promoCode, channel, username, booking } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (promoCode) filters.promoCode = promoCode;
    if (channel) filters.channel = channel;
    if (username) filters.username = username;
    if (booking) filters.booking = booking;

    const transactions = await Transaction.getAll(filters);
    const summary = await Transaction.getSummary(filters);

    res.json({
      success: true,
      data: transactions,
      summary: {
        totalTransactions: transactions.length,
        totalAmount: transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transactions',
      error: error.message
    });
  }
};

/**
 * Get transaction statistics grouped by agent
 * GET /api/transactions/stats
 */
exports.getTransactionStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const stats = await Transaction.getStatsByAgent(filters);
    const summary = await Transaction.getSummary(filters);

    res.json({
      success: true,
      data: stats,
      summary: {
        totalTransactions: summary.total_transactions,
        totalAmount: parseFloat(summary.total_amount) || 0
      }
    });

  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction statistics',
      error: error.message
    });
  }
};

/**
 * Get filter options (unique channels and booking types)
 * GET /api/transactions/filter-options
 */
exports.getFilterOptions = async (req, res) => {
  try {
    const channels = await Transaction.getUniqueChannels();
    const bookingTypes = await Transaction.getUniqueBookingTypes();

    res.json({
      success: true,
      data: {
        channels,
        bookingTypes
      }
    });

  } catch (error) {
    console.error('Get filter options error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching filter options',
      error: error.message
    });
  }
};

/**
 * Delete transactions by date
 * DELETE /api/transactions/:date
 */
exports.deleteByDate = async (req, res) => {
  try {
    const { date } = req.params;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    const result = await Transaction.deleteByDate(date);

    res.json({
      success: true,
      message: `Deleted ${result.affectedRows} transactions for date ${date}`,
      data: {
        deletedCount: result.affectedRows
      }
    });

  } catch (error) {
    console.error('Delete transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting transactions',
      error: error.message
    });
  }
};

/**
 * Delete all transactions
 * DELETE /api/transactions/all
 */
exports.deleteAll = async (req, res) => {
  try {
    const result = await Transaction.deleteAll();

    res.json({
      success: true,
      message: `Deleted all ${result.affectedRows} transactions`,
      data: {
        deletedCount: result.affectedRows
      }
    });

  } catch (error) {
    console.error('Delete all transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting all transactions',
      error: error.message
    });
  }
};
