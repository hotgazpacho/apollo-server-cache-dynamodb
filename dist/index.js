"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DEFAULT_TABLE_NAME = 'KeyValueCache';
const DEFAULT_PARTITION_KEY = 'CacheKey';
const DEFAULT_VALUE_ATTRIBUTE = 'CacheValue';
const DEFAULT_TTL_ATTRIBUTE = 'CacheTTL';
const DEFAULT_SORT_KEY_VALUE = 'apq';
const DEFAULT_TTL = 300;
class DynamoDBCache {
    constructor(client, options = {}) {
        this.client = client;
        const { tableName = DEFAULT_TABLE_NAME, partitionKeyName = DEFAULT_PARTITION_KEY, sortKeyName, sortKeyValue = DEFAULT_SORT_KEY_VALUE, valueAttribute = DEFAULT_VALUE_ATTRIBUTE, ttlAttribute = DEFAULT_TTL_ATTRIBUTE, defaultTTL = DEFAULT_TTL, } = options;
        this.tableName = tableName;
        this.partitionKeyName = partitionKeyName;
        this.sortKeyName = sortKeyName;
        this.sortKeyValue = sortKeyValue;
        this.valueAttribute = valueAttribute;
        this.ttlAttribute = ttlAttribute;
        this.defaultTTL = defaultTTL;
    }
    get(key) {
        const params = {
            Key: Object.assign({ [this.partitionKeyName]: key }, (this.sortKeyName ? { [this.sortKeyName]: this.sortKeyValue } : {})),
            TableName: this.tableName,
        };
        return this.client
            .get(params)
            .promise()
            .then(({ Item = {} }) => {
            if (!Item[this.ttlAttribute] || Item[this.ttlAttribute] >= Math.floor(Date.now() / 1000)) {
                return Item[this.valueAttribute];
            }
            return undefined;
        });
    }
    set(key, value, options) {
        const epochSeconds = this.calculateTTL(options);
        if (epochSeconds === undefined) {
            return new Promise(resolve => resolve());
        }
        const params = {
            Item: Object.assign({ [this.partitionKeyName]: key, [this.valueAttribute]: value, [this.ttlAttribute]: epochSeconds }, (this.sortKeyName ? { [this.sortKeyName]: this.sortKeyValue } : {})),
            TableName: this.tableName,
        };
        return this.client
            .put(params)
            .promise()
            .then(() => { });
    }
    delete(key) {
        const params = {
            Key: Object.assign({ [this.partitionKeyName]: key }, (this.sortKeyName ? { [this.sortKeyName]: this.sortKeyValue } : {})),
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