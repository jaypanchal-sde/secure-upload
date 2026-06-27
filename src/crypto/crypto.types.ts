import { Transform } from "stream";

export interface EncryptionPipelineResult{
    readonly encryptedStream: Transform; //Transform stream pushing out the encrypted ciphertext chunks
    readonly initializationVector:Buffer; //The unique 12-byte Initialization Vector (IV) generated
    readonly getAuthenticationTag:()=>Promise<Buffer>; //An asynchronous getter function that resolves to the final 16-byte authentication tag once the stream completes

}