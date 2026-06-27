import { DEFAULT_UPLOAD_CONFIG } from "./defaults.config";
import { UploadConfig } from "../@types/config.types";

export class ConfigManager{
    private static instance:ConfigManager;
    private readonly activeConfig:UploadConfig;


    private constructor(customConfig:UploadConfig){
        this.validateIncomingConfig(customConfig);
        this.activeConfig = this.mergeWithDefaults(customConfig);
        this.deepFreeze(this.activeConfig);
    }

    // inti or return the configuration instance
    public static initialize(customConfig:UploadConfig):ConfigManager{
        if(!ConfigManager.instance){
            ConfigManager.instance = new ConfigManager(customConfig);
        }
        return ConfigManager.instance;
    }

    // getter method to retrive the immutable configuration state
    public static getConfig():UploadConfig{
        if(!ConfigManager.instance){
            throw new Error(
                '[ConfigManager Error]: Vault configuration has not been initialized. Call ConfigManager.initialize(config) first.'
            );
        }
        return ConfigManager.instance.activeConfig;
    }

    // validation check for bad Configuration.
    private validateIncomingConfig(config:UploadConfig):void{
        if(!config.secretKey || config.secretKey.trim().length == 0){
            throw new Error('[Initialization Error]: A valid, non-empty secretKey is strictly required for secure chunk encryption.');
        }

        if(config.securityValidationLimits?.maxFileSizeInBytes != undefined && config.securityValidationLimits.maxFileSizeInBytes <=0){
            throw new Error('[Initialization Error]: maxFileSizeInBytes must be a positive integer value greater than 0.');
        }
    }

    //merge consumer config over the default fallbacks.
    private mergeWithDefaults(config:UploadConfig):UploadConfig{
        return{
            secretKey:config.secretKey,
            storageDriver:config.storageDriver ?? DEFAULT_UPLOAD_CONFIG.storageDriver,
            payloadStorageDir:config.payloadStorageDir ?? DEFAULT_UPLOAD_CONFIG.payloadStorageDir,
            cryptoMetadataDir:config.payloadStorageDir ?? DEFAULT_UPLOAD_CONFIG.cryptoMetadataDir,
            securityValidationLimits:{
                maxFileSizeInBytes:config.securityValidationLimits?.maxFileSizeInBytes ?? DEFAULT_UPLOAD_CONFIG.securityValidationLimits.maxFileSizeInBytes,
                allowedMimeTypes:config.securityValidationLimits?.allowedMimeTypes ?? DEFAULT_UPLOAD_CONFIG.securityValidationLimits.allowedMimeTypes
                }
        };
    }

    //freezes an object to make it complet readonly at runtime
    private deepFreeze(obj:any):void{
        Object.freeze(obj);
        if(obj.securityValidationLimits){
            Object.freeze(obj.securityValidationLimits);
        }
    }

}