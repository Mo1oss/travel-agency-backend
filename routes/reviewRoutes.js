// routes/reviewRoutes.js
const express = require('express');
const reviews = require('../controllers/reviewsController');

const router = express.Router();

// /details must be declared before /:id
router.get('/details', reviews.getReviewDetails);

router.get('/', reviews.getAllReviews);
router.get('/:id', reviews.getReviewById);
router.post('/', reviews.createReview);
router.put('/:id', reviews.updateReview);
router.delete('/:id', reviews.deleteReview);

module.exports = router;
