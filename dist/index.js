"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DEFAULT_TABLE_NAME = 'KeyValueCache';
const DEFAULT_PARTITION_KEY = 'CacheKey';
const DEFAULT_VALUE_ATTRIBUTE = 'CacheValue';
const DEFAULT_TTL_ATTRIBUTE = 'CacheTTL';
const DEFAULT_TTL = 300;
class DynamoDBCache {
    constructor(client, options = {}) {
        this.client = client;
        const { tableName = DEFAULT_TABLE_NAME, partitionKeyName = DEFAULT_PARTITION_KEY, valueAttribute = DEFAULT_VALUE_ATTRIBUTE, ttlAttribute = DEFAULT_TTL_ATTRIBUTE, defaultTTL = DEFAULT_TTL, } = options;
        this.tableName = tableName;
        this.partitionKeyName = partitionKeyName;
        this.valueAttribute = valueAttribute;
        this.ttlAttribute = ttlAttribute;
        this.defaultTTL = defaultTTL;
    }
    get(key) {
        const params = {
            Key: {
                [this.partitionKeyName]: key,
            },
            TableName: this.tableName,
        };
        return this.client
            .get(params)
            .promise()
            .then(({ Item = {} }) => Item[this.valueAttribute]);
    }
    set(key, value, options) {
        const epochSeconds = this.calculateTTL(options);
        if (epochSeconds === undefined) {
            return new Promise(resolve => resolve());
        }
        const params = {
            Item: {
                [this.partitionKeyName]: key,
                [this.valueAttribute]: value,
                [this.ttlAttribute]: epochSeconds,
            },
            TableName: this.tableName,
        };
        return this.client
            .put(params)
            .promise()
            .then(() => { });
    }
    delete(key) {
        const params = {
            Key: {
                [this.partitionKeyName]: key,
            },
            TableName: this.tableName,
        };
        return this.client
            .delete(params)
            .promise()
            .then(() => { });
    }
    calculateTTL(options = {}) {
        const { ttl = this.defaultTTL } = options;
        if (ttl <= 0) {
            return undefined;
        }
        const epochSeconds = Math.floor(Date.now() / 1000) + ttl;
        return epochSeconds;
    }
}
exports.DynamoDBCache = DynamoDBCache;
//# sourceMappingURL=index.js.map