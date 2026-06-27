import { ParsedFilePayload } from "../http/http.types";
import { EncryptionPipelineResult } from "../crypto/crypto.types";
import { StorageWriteResult } from "./storage.types";
import { Readable } from "stream";


export interface StorageDriver {
    store(
        filePayload: ParsedFilePayload,
        cryptoPipeline: EncryptionPipelineResult
    ): Promise<StorageWriteResult>;

    retrieve(uniqueFileId: string): Promise<{
        payloadStream: Readable;
        savedPayloadPath: string;
    }>;

    delete(savedPayloadPath: string, savedMetadataPath: string): Promise<void>;
}