const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { heavyReadLimiter } = require('../middleware/rateLimitMiddleware');

router.get('/preset-prompts', aiController.getPresetPrompts);
router.post('/chat', heavyReadLimiter, aiController.chatWithAi);
router.get('/chat', heavyReadLimiter, aiController.chatWithAi);

// AI Knowledge Training Endpoints
router.get('/knowledge', aiController.getKnowledgeList);
router.post('/knowledge', aiController.addKnowledge);

module.exports = router;
