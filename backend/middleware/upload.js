import multer from "multer"

export const upload = multer({
    storage: multer.memoryStorage(),
    limits: {fileSize: 5 * 1024 * 1024}, // Limit file size to 5MB
    fileFilter: (req, file, cb) => {
        if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype))
          return cb(new Error("Only JPG, PNG or WEBP images are allowed"));
        cb(null, true);
      },
});
