const cloudinary = require('cloudinary').v2;
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// Cloudinary config (Make sure .env me variables hain)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImage = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, 'No image file provided');
    }

    // Buffer ko base64 Data URI me convert karein
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    // Cloudinary par upload karein
    const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'verant_products', // Aapka folder name
        resource_type: 'image',
    });

    return new ApiResponse(200, 'Image uploaded successfully', {
        url: result.secure_url,
        public_id: result.public_id,
    }).send(res);
});

module.exports = { uploadImage };