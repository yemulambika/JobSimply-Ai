import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
      return;
    }
    cb(new Error('Only PDF files are allowed'));
  }
});

export async function uploadToCloudinary(buffer, originalName) {
  const publicId = `resume_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'resumes',
        resource_type: 'raw',
        public_id: publicId,
        format: 'pdf'
      },
      (error, result) => {
        if (error) reject(error);
        else
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id
          });
      }
    );

    stream.end(buffer);
  });
}