// tslint:disable: no-empty
import { KeyValueCache } from 'apollo-server-caching';
import DynamoDB = require('aws-sdk/clients/dynamodb');

const DEFAULT_TABLE_NAME = 'KeyValueCache';
const DEFAULT_PARTITION_KEY = 'CacheKey';
const DEFAULT_VALUE_ATTRIBUTE = 'CacheValue';
const DEFAULT_TTL_ATTRIBUTE = 'CacheTTL';

// tslint:disable-next-line: interface-name
export interface DynamoDBCacheOptions {
  tableName?: string;
  partitionKeyName?: string;
  valueAttribute?: string;
  ttlAttribute?: string;
}

export default class DynamoDBCache implements KeyValueCache {
  private client: DynamoDB.DocumentClient;
  private tableName: string;
  private partitionKeyName: string;
  private valueAttribute: string;
  private ttlAttribute: string;

  constructor(client: DynamoDB.DocumentClient, options: DynamoDBCacheOptions = {}) {
    this.client = client;

    const {
      tableName = DEFAULT_TABLE_NAME,
      partitionKeyName = DEFAULT_PARTITION_KEY,
      valueAttribute = DEFAULT_VALUE_ATTRIBUTE,
      ttlAttribute = DEFAULT_TTL_ATTRIBUTE,
    } = options;

    this.tableName = tableName;
    this.partitionKeyName = partitionKeyName;
    this.valueAttribute = valueAttribute;
    this.ttlAttribute = ttlAttribute;
  }

  public get(key: string): Promise<string> {
    const params: DynamoDB.DocumentClient.GetItemInput = {
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

  public set(key: string, value: string, options?: { ttl?: number }): Promise<void> {
    const params: DynamoDB.DocumentClient.PutItemInput = {
      Item: {
        [this.partitionKeyName]: key,
        [this.valueAttribute]: value,
      },
      TableName: this.tableName,
    };
    if (options && options.ttl) {
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + options.ttl);
      const epochSeconds = Math.floor(expiresAt.getTime() / 1000);
      params.Item[this.ttlAttribute] = epochSeconds;
    }
    return this.client
      .put(params)
      .promise()
      .then(() => {});
  }

  public delete(key: string): Promise<boolean | void> {
    const params: DynamoDB.DocumentClient.DeleteItemInput = {
      Key: {
        [this.partitionKeyName]: key,
      },
      TableName: this.tableName,
    };
    return this.client
      .delete(params)
      .promise()
      .then(() => {});
  }
}
