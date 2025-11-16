const express = require('express');
const router = express.Router();
const {
  getJobs,
  getJob,
  createJob,
  applyToJob,
  downloadCV
} = require('../controllers/jobController');
const { protect } = require('../middleware/auth');

router.get('/', getJobs);
router.get('/:id', getJob);
router.post('/', protect, createJob);
router.post('/apply', protect, applyToJob);
router.get('/cv/download', protect, downloadCV);

module.exports = router;
