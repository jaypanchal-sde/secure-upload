import {Readable} from "stream";

export interface ParsedFilePayload{
    readonly originalFileName:string; //originalfile name eg.('invoice.pdf')
    readonly formFieldName:string; //field name from the form data eg.('file' or 'attachments')
    readonly mimeType:string; //media type of fileeg('application/pdf')
    readonly fileStream:Readable;  //raw,unencrypted binary chunk stream from the request connection
}