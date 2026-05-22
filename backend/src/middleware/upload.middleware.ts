import multer from "multer";
import { config } from "../config/index.js";

const storage = multer.diskStorage({
  destination: config.uploadDir,
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: config.maxFileSize },
});
