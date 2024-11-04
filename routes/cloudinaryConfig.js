const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Set up storage for Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'product_images', // Set your folder name in Cloudinary
        allowed_formats: ['jpg', 'jpeg', 'png'],
        // Optionally, you can set a public ID for the image
        public_id: (req, file) => Date.now() + path.extname(file.originalname), // Example: Use timestamp as public ID
    }
});

// Initialize multer with the storage configuration
const upload = multer({ storage });

module.exports = upload;
