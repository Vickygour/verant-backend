const express = require('express');
const multer = require('multer');
const { uploadImage } = require('../controllers/upload.controller');
const { protect, authorize } = require('../middlewares/auth.middleware'); // Apne auth middleware ka sahi path dalein

const router = express.Router();

// Memory storage (Cloudinary par direct buffer bhejne ke liye)
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 🔥 20MB (pehle 5MB tha)
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    },
});

router.post(
    '/',
    protect,               // Auth check
    authorize('admin'),    // Admin check
    upload.single('image'), // 'image' key frontend FormData se match karna chahiye
    uploadImage
);

module.exports = router;