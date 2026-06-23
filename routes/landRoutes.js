const express = require('express');
const router = express.Router();
const landController = require('../controllers/landController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const upload = require('../utils/plotUpload');

router.get('/', landController.getAllPlots);
router.get('/my-plots', protect, landController.getMyPlots);
router.get('/:code', landController.getPlotByCode);

// Only Landowners or LRO can create plots (LRO for initial registration)
router.post('/', protect, restrictTo('Landowner', 'LRO', 'Admin'), upload.single('coverImage'), landController.createLandPlot);
router.post('/register-all', protect, restrictTo('LRO', 'Admin'), upload.single('coverImage'), landController.registerLandAndOwner);router.patch('/:id/status', protect, restrictTo('LRO', 'Admin'), landController.updatePlotStatus);

module.exports = router;
