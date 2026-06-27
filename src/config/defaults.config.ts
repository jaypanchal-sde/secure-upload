import { UploadConfig } from "../@types/config.types";
import path from 'path';

const CurrentApplicationWorkSpaceRoot = process.cwd();


type DefaultConfigType = Required<Omit<UploadConfig, "secretKey" | "s3">> & { 
    readonly s3?: UploadConfig["s3"] 
};

export const DEFAULT_UPLOAD_CONFIG: DefaultConfigType = {
    storageDriver: "local",
    payloadStorageDir: path.join(CurrentApplicationWorkSpaceRoot, 'secure_vault', 'payloads'),
    cryptoMetadataDir: path.join(CurrentApplicationWorkSpaceRoot, 'secure_vault', 'metadata'),
    securityValidationLimits: {
        maxFileSizeInBytes: 50 * 1024 * 1024, // 50 MB
        allowedMimeTypes: [] // Empty array means allow all by default unless specified
    }
};