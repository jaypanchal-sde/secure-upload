import { Transform,TransformCallback } from "stream";
import { ConfigManager } from "../config/ConfigManager";
import { EncryptionPipelineResult } from "./crypto.types";
import crypto from "crypto";
export class CipherStream{
    public static createEncryptionPipline():EncryptionPipelineResult{
        //1.pull the master key from centralized config
        const masterPassphrase = ConfigManager.getConfig().secretKey;
        
        //2.Derive a secure 32-byte cryptographic key using SHA-256
        const cryptographicKey = crypto.createHash('sha256').update(masterPassphrase).digest();

        //3.Generate  a brand new, highly random (IV)
        const initializationVector = crypto.randomBytes(12);

        //4.Initialize the native Node.js GCM Cipher Instance
        const cipher = crypto.createCipheriv("aes-256-gcm",cryptographicKey,initializationVector);

        //5. create a Promise-based Bridge to capture the final 16-byte Auth tag
        let resolveAuthTag:(tag:Buffer)=>void;
        const authTagPromise = new Promise<Buffer>((resolve)=>{
            resolveAuthTag = resolve;
        })

        //6. Assemble the Transform Streaming Pipe

        const encryptedStream = new Transform({
            transform(chunk:any,encoding:BufferEncoding,callback:TransformCallback):void{
                try{
                    const encryptedChunk = cipher.update(chunk);
                    this.push(encryptedChunk);
                    callback();
                }catch(error){
                    callback(error instanceof Error ? error:new Error(String(error)));
                }
            },


            flush(callback:TransformCallback):void{
                try{
                    const finalEncryptedChunk = cipher.final();
                    if(finalEncryptedChunk.length > 0){
                        this.push(finalEncryptedChunk);
                    }
                    const finalAuthenticationTag = cipher.getAuthTag();
                    resolveAuthTag(finalAuthenticationTag);
                    callback();
                }catch(error){
                    callback(error instanceof Error ? error : new Error(String(error)));
                }
            }
        });

        return{
            encryptedStream,
            initializationVector,
            getAuthenticationTag:()=>authTagPromise,
        };

    }
}