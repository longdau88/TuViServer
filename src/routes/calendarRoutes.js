const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');

router.get('/today', calendarController.getToday);
router.get('/month', calendarController.getMonth);
router.get('/year', calendarController.getYear);
router.get('/grid', calendarController.getCalendarGrid);
router.get('/convert', calendarController.convertDate);
router.post('/auspicious-days', calendarController.getPersonalizedAuspiciousDays);
router.get('/auspicious-days', calendarController.getPersonalizedAuspiciousDays);

module.exports = router;
