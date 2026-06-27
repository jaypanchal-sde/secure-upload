import { StorageDriver } from "./StorageDriver.interface";
import { LocalDiskStorage } from "./LocalDiskStorage";
import { S3StorageDriver } from "./S3StorageDriver";
import { ConfigManager } from "../config/ConfigManager";

export class StorageFactory {
    
    public static getDriver(): StorageDriver {
        const config = ConfigManager.getConfig();

        switch (config.storageDriver) {
            case "s3":
            case "r2":
                return new S3StorageDriver();
            case "local":
            default:
              
                return (LocalDiskStorage as unknown) as StorageDriver;
        }
    }
}