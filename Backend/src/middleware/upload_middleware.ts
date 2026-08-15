import multer from "multer";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const storage = multer.memoryStorage();

// Bytes are kept in memory only (never written to Backend/storage) - the
// route handler is responsible for saving req.file.buffer into MongoDB.
export const uploadImage = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_TYPES.includes(file.mimetype)) {
            const error: Error & { statusCode?: number } = new Error(
                "Only JPEG, PNG, and WEBP images are allowed"
            );
            error.statusCode = 400;
            cb(error);
            return;
        }
        cb(null, true);
    },
}).single("file");
