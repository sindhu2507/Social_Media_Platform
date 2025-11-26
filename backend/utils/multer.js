import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// These lines are required to replicate __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../uploads/profilepics"));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

// File filter (optional: only images)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const ext = path.extname(file.originalname).toLowerCase();
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(ext);
  if (mimetype && extname) return cb(null, true);
  cb(new Error("Only image files are allowed!"));
};

const upload = multer({ storage, fileFilter });

export default upload; // ✅ Proper ES module export
