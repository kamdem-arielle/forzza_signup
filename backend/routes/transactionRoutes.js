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

// Get filter options (unique channels and booking types) - SuperAdmin
// GET /api/transactions/filter-options
router.get('/filter-options', transactionController.getFilterOptions);

// Get filter options for a specific admin
// GET /api/transactions/admin/:admin_id/filter-options
router.get('/admin/:admin_id/filter-options', transactionController.getFilterOptionsByAdminId);

// Get all transactions with filters - SuperAdmin
// GET /api/transactions?startDate=&endDate=&promoCode=&channel=&username=&booking=
router.get('/', transactionController.getTransactions);

// Get transactions for a specific admin
// GET /api/transactions/admin/:admin_id?startDate=&endDate=&promoCode=&channel=&username=&booking=
router.get('/admin/:admin_id', transactionController.getTransactionsByAdminId);

// Get transaction statistics by agent - SuperAdmin
// GET /api/transactions/stats?startDate=&endDate=
router.get('/stats', transactionController.getTransactionStats);

// Get transaction statistics for a specific admin
// GET /api/transactions/admin/:admin_id/stats?startDate=&endDate=
router.get('/admin/:admin_id/stats', transactionController.getTransactionStatsByAdminId);

// Delete all transactions
// DELETE /api/transactions/all
router.delete('/all', transactionController.deleteAll);

// Delete transactions by date
// DELETE /api/transactions/:date
router.delete('/:date', transactionController.deleteByDate);

module.exports = router;
