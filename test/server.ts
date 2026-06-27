import express from "express";
import path from "path";
import { ConfigManager } from "../src/config/ConfigManager";
import { UploadMiddleware } from "../src/middleware/UploadMiddleware";
import { DownloadController } from "../src/middleware/DownloadController";

const app = express();
const PORT = 3000;

// 1. Initialize your package configuration
ConfigManager.initialize({
    secretKey: "super-secure-32-character-passphrase-key-here",
    storageDriver: "local",
    cryptoMetadataDir: path.join(process.cwd(), "secure_vault", "metadata"),
    securityValidationLimits: {
        maxFileSizeInBytes: 10 * 1024 * 1024, // 10MB Limit
        // allowedMimeTypes: ["image/png", "image/jpeg", "application/pdf",] // Allowed lists
    }
});

/**
 * 🚀 TEST ROUTE 1: Atomic Secure Upload
 */
app.post("/api/upload", UploadMiddleware.handle(), (req: any, res) => {
    res.status(200).json({
        success: true,
        message: "Upload completed and deeply encrypted!",
        meta: req.secureUploads || []
    });
});

/**
 * 🚀 TEST ROUTE 2: Plug-and-Play Stream Decryption
 * Note: The param MUST be named exactly ":fileId"
 */
app.get("/api/download/:fileId", DownloadController.handle());

app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 Secure Testing Server active at http://localhost:${PORT}`);
    console.log(`==================================================\n`);
});