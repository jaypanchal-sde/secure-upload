export interface UploadConfig {
    readonly secretKey: string;
    readonly storageDriver: "local" | "s3" | "r2"; 
    readonly payloadStorageDir?: string;
    readonly cryptoMetadataDir?: string;
    readonly securityValidationLimits?: {
        readonly maxFileSizeInBytes?: number;
        readonly allowedMimeTypes?: string[];
    };
    
    readonly s3?: {
        readonly bucketName: string;
        readonly accessKeyId: string;
        readonly secretAccessKey: string;
        readonly region?: string;
        readonly endpoint?: string; 
    };
}