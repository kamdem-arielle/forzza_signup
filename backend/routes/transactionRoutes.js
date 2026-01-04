const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

/**
 * Transaction Routes
 * All routes are prefixed with /api/transactions
 */

// Import transactions from Excel
// POST /api/transactions/import
router.post('/import', transactionController.importExcel);

// Get filter options (unique channels and booking types)
// GET /api/transactions/filter-options
router.get('/filter-options', transactionController.getFilterOptions);

// Get all transactions with filters
// GET /api/transactions?startDate=&endDate=&promoCode=&channel=&username=&booking=
router.get('/', transactionController.getTransactions);

// Get transaction statistics by agent
// GET /api/transactions/stats?startDate=&endDate=
router.get('/stats', transactionController.getTransactionStats);

// Delete all transactions
// DELETE /api/transactions/all
router.delete('/all', transactionController.deleteAll);

// Delete transactions by date
// DELETE /api/transactions/:date
router.delete('/:date', transactionController.deleteByDate);

module.exports = router;
