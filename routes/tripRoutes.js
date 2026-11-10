// routes/tripRoutes.js
const express = require('express');
const trips = require('../controllers/tripsController');

const router = express.Router();

// /ratings must be declared before /:id
router.get('/ratings', trips.getTripsWithRatings);

router.get('/', trips.getAllTrips);
router.get('/:id', trips.getTripById);
router.post('/', trips.createTrip);
router.put('/:id', trips.updateTrip);
router.delete('/:id', trips.deleteTrip);

module.exports = router;
