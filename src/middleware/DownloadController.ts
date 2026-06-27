import { Request, Response, NextFunction } from 'express';
import { DecryptionEngine } from '../crypto/DecryptionEngine';

export class DownloadController {
  
    public static handle() {
        return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
            try {
                // Expecting the route param to be named :fileId (e.g., /api/download/:fileId)
                const { fileId } = req.params;

                if (!fileId) {
                    res.status(400).json({ success: false, error: "Missing required file ID parameter." });
                    return;
                }

                // 1. Run your package's stream decryption core
                const { decryptedStream, originalFilename, mimeType } = await DecryptionEngine.decrypt(fileId as string);

                // 2. Set native browser viewing/download headers automatically
                res.setHeader('Content-Type', mimeType);
                res.setHeader('Content-Disposition', `inline; filename="${originalFilename}"`);

                // 3. Pipe it directly out to the user's browser window
                decryptedStream.pipe(res);

                // Handle sudden connection cuts gracefully
                decryptedStream.on('error', (err: any) => {
                    if (!res.headersSent) {
                        res.status(500).json({ success: false, error: "Decryption stream failure." });
                    }
                });

            } catch (error: any) {
                res.status(404).json({
                    success: false,
                    error: error.message || "The requested secure file asset could not be found."
                });
            }
        };
    }
}