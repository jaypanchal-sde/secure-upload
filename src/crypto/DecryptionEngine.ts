import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Transform, TransformCallback } from 'stream';
import { ConfigManager } from '../config/ConfigManager';
import { FileCryptographicMetadata } from '../storage/storage.types';
import { StorageFactory } from '../storage/StorageFactory'; 

export class DecryptionEngine {
  
  public static async decrypt(uniqueFileId: string): Promise<{
    decryptedStream: Transform;
    originalFilename: string;
    mimeType: string;
  }> {
    const config = ConfigManager.getConfig();
    const masterPassphrase = config.secretKey;

    // 1. Locate and parse the companion JSON metadata parameters
    const metadataDir = config.cryptoMetadataDir || path.join(process.cwd(), 'secure_vault', 'metadata');
    const metadataPath = path.join(metadataDir, `${uniqueFileId}.meta.json`);

    if (!fs.existsSync(metadataPath)) {
      throw new Error(`[Decryption Error]: Cryptographic metadata map missing for ID: ${uniqueFileId}`);
    }

    const metadataRaw = await fs.promises.readFile(metadataPath, 'utf8');
    const metadata: FileCryptographicMetadata = JSON.parse(metadataRaw);

    // 2. Regenerate the identical 32-byte master key via SHA-256
    const cryptographicKey = crypto.createHash('sha256').update(masterPassphrase).digest();

    // 3. Re-instantiate the AES-256-GCM decipher operation matrix using the stored IV
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      cryptographicKey,
      Buffer.from(metadata.initializationVectorHex, 'hex')
    );

    decipher.setAuthTag(Buffer.from(metadata.authenticationTagHex, 'hex'));

    // 4. Construct the high-performance Transform stream translation tunnel
    const decryptedStream = new Transform({
      transform(chunk: any, encoding: string, callback: TransformCallback) {
        try {
          const decryptedChunk = decipher.update(chunk);
          this.push(decryptedChunk);
          callback();
        } catch (err) {
          callback(err instanceof Error ? err : new Error(String(err)));
        }
      },
      flush(callback: TransformCallback) {
        try {
          const finalChunk = decipher.final(); // 🛡️ Validates file integrity here
          if (finalChunk.length > 0) {
            this.push(finalChunk);
          }
          callback();
        } catch (err) {
          callback(new Error(`[Security Violation]: Cryptographic integrity check failed. The file has been modified or tampered with.`));
        }
      }
    });

    // 5.  DYNAMIC STRATEGY RESOLUTION:
    // Resolve our active cloud or disk driver strategy using the factory layout.
    const driver = StorageFactory.getDriver();
    const { payloadStream } = await driver.retrieve(uniqueFileId);
    
    // Bubble stream errors up cleanly from the driver source
    payloadStream.on('error', (err) => decryptedStream.emit('error', err));
    
    // Pipe the retrieved source chunk stream directly through our crypto decryption tunnel
    payloadStream.pipe(decryptedStream);

    return {
      decryptedStream,
      originalFilename: metadata.originalFileName || metadata.originalFileName,
      mimeType: metadata.mimeType
    };
  }
}