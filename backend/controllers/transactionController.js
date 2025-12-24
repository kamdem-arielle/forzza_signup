const Transaction = require('../models/Transaction');
const Agent = require('../models/Agent');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const path = require('path');
const fs = require('fs');

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * Transaction Controller
 * Handles PDF import and transaction data retrieval
 */

/**
 * Import transactions from PDF
 * POST /api/transactions/import
 */
exports.importPDF = [
  upload.single('pdfFile'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'PDF file is required'
        });
      }

      const { transactionDate } = req.body;

      if (!transactionDate) {
        return res.status(400).json({
          success: false,
          message: 'Transaction date is required'
        });
      }

      // Parse PDF
      const pdfData = await pdfParse(req.file.buffer);
      const text = pdfData.text;

      // Extract transactions using regex
      // Pattern: ShopName - ClientName (x x) 500,00 XAF
      // Matches any shop name followed by " - ", then client name, then parentheses, then amount in XAF
      const regex = /[\w\s]+\s*-\s*(\S+)\s*\([^)]*\)\s*([\d\s]+[,.][\d]+)\s*XAF/gi;
      const transactions = [];
      let match;

      while ((match = regex.exec(text)) !== null) {
        const bettorName = match[1].trim();
        // Parse amount: "500,00" or "1 000,00" -> 500.00 or 1000.00
        const amountStr = match[2].replace(/\s/g, '').replace(',', '.');
        const amount = parseFloat(amountStr);

        if (bettorName && !isNaN(amount)) {
          transactions.push({
            bettorName,
            amount,
            // promoCode: null,
            transactionDate
          });
        }
      }

      if (transactions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid transactions found in the PDF. Please check the file format.'
        });
      }

      // Insert transactions into database
      const result = await Transaction.bulkCreate(transactions);

      res.json({
        success: true,
        message: `Successfully imported ${result.affectedRows} transactions`,
        data: {
          importedCount: result.affectedRows,
          transactionDate
        }
      });

    } catch (error) {
      console.error('Import PDF error:', error);
      res.status(500).json({
        success: false,
        message: 'Error importing PDF',
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
    const { startDate, endDate, promoCode } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (promoCode) filters.promoCode = promoCode;

    const transactions = await Transaction.getAll(filters);
    const summary = await Transaction.getSummary(filters);

    res.json({
      success: true,
      data: transactions,
      summary: {
        totalTransactions: transactions.length,
        totalAmount: transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)
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
