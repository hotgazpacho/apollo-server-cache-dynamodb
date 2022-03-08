import { KeyValueCache } from 'apollo-server-caching';
import DynamoDB = require('aws-sdk/clients/dynamodb');
export interface DynamoDBCacheOptions {
    tableName?: string;
    partitionKeyName?: string;
    sortKeyName?: string;
    sortKeyValue?: string;
    valueAttribute?: string;
    ttlAttribute?: string;
    defaultTTL?: number;
}
export declare class DynamoDBCache implements KeyValueCache {
    private client;
    private tableName;
    private partitionKeyName;
    private sortKeyName;
    private sortKeyValue;
    private valueAttribute;
    private ttlAttribute;
    private defaultTTL;
    constructor(client: DynamoDB.DocumentClient, options?: DynamoDBCacheOptions);
    get(key: string): Promise<string>;
    set(key: string, value: string, options?: {
        ttl?: number;
    }): Promise<void>;
    delete(key: string): Promise<boolean | void>;
    private calculateTTL;
}
//# sourceMappingURL=index.d.ts.map