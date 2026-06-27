import { StorageDriver } from "./StorageDriver.interface";
import { ParsedFilePayload } from "../http/http.types";
import { EncryptionPipelineResult } from "../crypto/crypto.types";
import { StorageWriteResult, FileCryptographicMetadata } from "./storage.types";
import { ConfigManager } from "../config/ConfigManager";
import { S3Client, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { Readable } from "stream";

export class S3StorageDriver implements StorageDriver {
    private s3Client: S3Client;
    private bucketName: string;

    constructor() {
        const config = ConfigManager.getConfig();
        
        // Initialize the standard AWS S3 client profile
        this.s3Client = new S3Client({
            region: config.s3?.region || "us-east-1",
            endpoint: config.s3?.endpoint, // Required for Cloudflare R2 / alternative object storage
            credentials: {
                accessKeyId: config.s3?.accessKeyId || "",
                secretAccessKey: config.s3?.secretAccessKey || ""
            },
            forcePathStyle: !!config.s3?.endpoint // Helps non-AWS endpoints resolve paths smoothly
        });
        
        this.bucketName = config.s3?.bucketName || "";
    }

    public async store(
        filePayload: ParsedFilePayload,
        cryptoPipeline: EncryptionPipelineResult
    ): Promise<StorageWriteResult> {
        const uniqueFileId = crypto.randomUUID();
        const objectKey = `payloads/${uniqueFileId}.enc`;
        const config = ConfigManager.getConfig();

        // 1. Pipe our crypto stream transform straight into the network wire to S3 / R2
        // Zero RAM accumulation spikes!
        const pipelineInput = cryptoPipeline.encryptedStream;
        filePayload.fileStream.pipe(pipelineInput);

        const cloudUpload = new Upload({
            client: this.s3Client,
            params: {
                Bucket: this.bucketName,
                Key: objectKey,
                Body: pipelineInput,
                ContentType: "application/octet-stream"
            }
        });

        // Execute cloud wire multi-part upload concurrently
        await cloudUpload.done();

        // 2. Extract the final 16-byte secure GCM authorization tag calculated on-the-fly
        const authTagBuffer = await cryptoPipeline.getAuthenticationTag();

        // 3. Formulate the companion Metadata Object Map
        const metadataPayload: FileCryptographicMetadata = {
            uniqueFileId,
            originalFileName: filePayload.originalFileName,
            mimeType: filePayload.mimeType,
            initializationVectorHex: cryptoPipeline.initializationVector.toString("hex"),
            authenticationTagHex: authTagBuffer.toString("hex"),
            savedPayloadPath: objectKey // For cloud drivers, this points directly to our S3 object key
        };

        // 4. Save metadata locally or on cloud (We'll save locally for structural tracking alignment)
        const localMetaDir = config.cryptoMetadataDir || path.join(process.cwd(), "secure_vault", "metadata");
        if (!fs.existsSync(localMetaDir)) fs.mkdirSync(localMetaDir, { recursive: true });
        
        const savedMetadataPath = path.join(localMetaDir, `${uniqueFileId}.meta.json`);
        await fs.promises.writeFile(savedMetadataPath, JSON.stringify(metadataPayload, null, 2), "utf8");

        return {
            success: true,
            uniqueFileId,
            savedPayloadPath: objectKey,
            savedMetadataPath
        };
    }

    public async retrieve(uniqueFileId: string): Promise<{ payloadStream: Readable; savedPayloadPath: string }> {
        const config = ConfigManager.getConfig();
        const localMetaDir = config.cryptoMetadataDir || path.join(process.cwd(), "secure_vault", "metadata");
        const metadataPath = path.join(localMetaDir, `${uniqueFileId}.meta.json`);

        const metadataRaw = await fs.promises.readFile(metadataPath, "utf8");
        const metadata: FileCryptographicMetadata = JSON.parse(metadataRaw);

        // Fetch the active read pipeline object straight from the cloud bucket
        const s3Response = await this.s3Client.send(new GetObjectCommand({
            Bucket: this.bucketName,
            Key: metadata.savedPayloadPath
        }));

        if (!s3Response.Body) {
            throw new Error(`[Cloud Error]: Content stream body missing from S3 target object payload.`);
        }

        return {
            payloadStream: s3Response.Body as Readable,
            savedPayloadPath: metadata.savedPayloadPath
        };
    }

    public async delete(savedPayloadPath: string, savedMetadataPath: string): Promise<void> {
        // Delete encrypted binary block from S3/R2
        await this.s3Client.send(new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: savedPayloadPath
        }));

        // Delete companion tracker profile locally
        if (fs.existsSync(savedMetadataPath)) {
            await fs.promises.unlink(savedMetadataPath);
        }
    }
}