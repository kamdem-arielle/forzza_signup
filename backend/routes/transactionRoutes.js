const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

/**
 * Transaction Routes
 * All routes are prefixed with /api/transactions
 */

// Import transactions from PDF
// POST /api/transactions/import
router.post('/import', transactionController.importPDF);

// Get all transactions with filters
// GET /api/transactions?startDate=&endDate=&promoCode=
router.get('/', transactionController.getTransactions);

// Get transaction statistics by agent
// GET /api/transactions/stats?startDate=&endDate=
router.get('/stats', transactionController.getTransactionStats);

// Delete transactions by date
// DELETE /api/transactions/:date
router.delete('/:date', transactionController.deleteByDate);

module.exports = router;
