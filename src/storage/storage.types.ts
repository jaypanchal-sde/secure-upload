export interface FileCryptographicMetadata{
    readonly uniqueFileId:string;
    readonly originalFileName:string;
    readonly mimeType:string;
    readonly initializationVectorHex:string;
    readonly authenticationTagHex:string;
    readonly savedPayloadPath:string;
}

export interface StorageWriteResult{
    readonly success:boolean;
    readonly uniqueFileId:string;
    readonly savedPayloadPath:string;
    readonly savedMetadataPath:string;
}