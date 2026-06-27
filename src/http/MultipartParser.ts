import { IncomingMessage } from "http";
import { ParsedFilePayload } from "./http.types";
import { ConfigManager } from "../config/ConfigManager";
import busboy from "busboy";

export class MultipartParser {
    public static parse(
        request: IncomingMessage,
        onFileStreamDetected: (payload: ParsedFilePayload) => Promise<void>
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const systemLimits = ConfigManager.getConfig().securityValidationLimits;
            const fileProcessingPromises: Promise<void>[] = [];
            let bb: busboy.Busboy;

            try {
                bb = busboy({
                    headers: request.headers,
                    limits: {
                        fileSize: systemLimits?.maxFileSizeInBytes,
                    },
                });
            } catch (error) {
                return reject(new Error(`[MultipartParser Error]: Failed to initialize parser stream. ${error instanceof Error ? error.message : String(error)}`));
            }

            bb.on('file', (name: string, stream: NodeJS.ReadableStream, info: busboy.FileInfo) => {

                const { filename, mimeType } = info;

                if (systemLimits?.allowedMimeTypes && systemLimits.allowedMimeTypes.length > 0) {
                    if (!systemLimits.allowedMimeTypes.includes(mimeType)) {
                        stream.resume();
                        return bb.emit("error", new Error(`[Security Violation]: File type '${mimeType}' is strictly prohibited.`));
                    }
                }

                // Construct our clean payload contract mapping
                const filePayload: ParsedFilePayload = {
                    formFieldName: name,
                    originalFileName: filename,
                    mimeType,
                    fileStream: stream as any,
                }

                const processingPromise = onFileStreamDetected(filePayload).catch((err) => {
                    bb.emit("error", err);
                });

                fileProcessingPromises.push(processingPromise);
            });

            bb.on('filesLimit', () => {
                reject(new Error('[Limit Exceeded]: Total file upload threshold broken. Stream terminated.'))
            });

            bb.on('error', (err: unknown) => {
                reject(err instanceof Error ? err : new Error(String(err)));
            });

            bb.on('finish', () => {
                Promise.all(fileProcessingPromises)
                    .then(() => resolve())
                    .catch((err) => reject(err));
            });

            request.pipe(bb);
        });
    }
}