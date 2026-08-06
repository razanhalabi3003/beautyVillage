// Legacy: generic unauthenticated disk-storage upload endpoint.
// To be replaced in Stage 6 by ownership-checked, MongoDB-backed Media uploads.
import express from "express";
const router = express.Router();
import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'storage/')
    },
    filename: function (req, file, cb) {
        const ext = file.originalname.split('.')
            .filter(Boolean) // removes empty extensions (e.g. `filename...txt`)
            .slice(1)
            .join('.')
        cb(null, Date.now() + "." + ext)
    }
})

const upload = multer({ storage: storage });

const base = process.env.DOMAIN_BASE;

router.post('/', upload.single("file"), function (req, res) {
    console.log("router.post(/file: " + base + req.file?.path)
    res.status(200).send({ url: base + "/" + req.file?.path })
});
export = router;
