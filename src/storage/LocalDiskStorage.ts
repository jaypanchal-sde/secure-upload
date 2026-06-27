import { EncryptionPipelineResult } from "../crypto/crypto.types";
import { ParsedFilePayload } from "../http/http.types";
import { FileCryptographicMetadata, StorageWriteResult } from "./storage.types";
import { ConfigManager } from "../config/ConfigManager";
import fs from 'fs';
import path from "path";
import { pipeline } from "stream/promises";


export class LocalDiskStorage{
    public static async store(
        filePayload:ParsedFilePayload,
        cryptoPipline:EncryptionPipelineResult
    ):Promise<StorageWriteResult>{

        //1. fetch file from config manager
        const config = ConfigManager.getConfig();
        const payloadDir = config.payloadStorageDir!;
        const metadataDir = config.cryptoMetadataDir!;

        //2. Ensure target storage dir exist on the host OS safely

        await fs.promises.mkdir(payloadDir,{recursive:true});
        await fs.promises.mkdir(metadataDir,{recursive:true});

        //3. Generate Highly unique id for this specific file transaction
        const uniqueFileId = crypto.randomUUID();

        //4. Setup file system target destinations
        const payloadFileName = `${uniqueFileId}.enc`;
        const metadataFileName = `${uniqueFileId}.meta.json`;

        const savedPayloadPath = path.join(payloadDir,payloadFileName);
        const savedMetadataPath = path.join(metadataDir,metadataFileName);

        //5. open an active operational write stream to the hard drive
        const diskWriteStream = fs.createWriteStream(savedPayloadPath);
        try{
            // 6. Securely link the incoming file stream into the encryption tunnel, then write directly to disk
            // pipeline automatically handles stream cleanups, errors, and close events gracefully
            await pipeline(
                filePayload.fileStream,
                cryptoPipline.encryptedStream,
                diskWriteStream
            );

            // 7. The stream has finished cleanly! We can now safely retrieve our final 16-byte authentication tag
            const finalAuthTag = await cryptoPipline.getAuthenticationTag();

            // 8. Assemble the structured cryptographic layout map
            const metadatapayload:FileCryptographicMetadata = {
                
                uniqueFileId,
                originalFileName:filePayload.originalFileName,
                mimeType:filePayload.mimeType,
                initializationVectorHex:cryptoPipline.initializationVector.toString("hex"),
                authenticationTagHex:finalAuthTag.toString("hex"),
                savedPayloadPath
            };

            // 9. Write the companion metadata file to the disk as atomic stringified JSON
            await fs.promises.writeFile(
                savedMetadataPath,
                JSON.stringify(metadatapayload,null,2),
                "utf8"
            );

            return{
                success:true,
                uniqueFileId,
                savedPayloadPath,
                savedMetadataPath
            };
        }catch(error){
            if(fs.existsSync(savedPayloadPath)){
                await fs.promises.unlink(savedPayloadPath).catch(()=>{});
            }
            throw new Error(`[Storage Storage Error]: Pipeline broken during write sequence. ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}