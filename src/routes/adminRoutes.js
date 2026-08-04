const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const aiController = require('../controllers/aiController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

// Public Admin Auth Route
router.post('/login', adminController.login);

// All routes below require valid Admin Authentication Token
router.use(authenticateToken, requireAdmin);

// System Dashboard Stats
router.get('/stats', adminController.getStats);

// User & Admin Management CRUD
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.put('/users/:id/role', adminController.updateRole);
router.put('/users/:id/vip', adminController.updateVip);


// VIP Packages Management
router.get('/packages', adminController.getPackages);
router.post('/packages', adminController.createPackage);
router.delete('/packages/:id', adminController.deletePackage);

// Revenue & Transaction Management
router.get('/transactions', adminController.getTransactions);
router.put('/transactions/:id/status', adminController.updateTransactionStatusController);
router.delete('/transactions/:id', adminController.deleteTransactionController);


// System Cache Management
router.post('/cache/clear-all', adminController.clearAllCache);

// AI Knowledge Management
router.get('/knowledge', aiController.getKnowledgeList);
router.post('/knowledge', aiController.addKnowledge);
router.delete('/knowledge/:id', adminController.deleteKnowledge);


module.exports = router;
