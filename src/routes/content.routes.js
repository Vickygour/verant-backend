const express = require('express');
const ctrl = require('../controllers/content.controller');

const router = express.Router();

router.get('/', ctrl.getAllContent);
router.get('/:key', ctrl.getContent);

module.exports = router;
