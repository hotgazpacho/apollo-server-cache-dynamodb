// tslint:disable: no-empty
import { KeyValueCache } from 'apollo-server-caching';
import DynamoDB = require('aws-sdk/clients/dynamodb');
import DataLoader from 'dataloader';
import { DynamoDBCacheOptions, IDynamoDBCacheOptions } from './DynamoDBCacheOptions';

export default class DynamoDBCache implements KeyValueCache {
  private client: DynamoDB.DocumentClient;
  private options: IDynamoDBCacheOptions;
  private dataloader: DataLoader<string, string> | undefined;

  constructor(
    client: DynamoDB.DocumentClient,
    options: IDynamoDBCacheOptions = new DynamoDBCacheOptions(),
    dataloader?: DataLoader<string, string>,
  ) {
    this.client = client;
    this.options = options;
    this.dataloader = dataloader;
  }

  public async get(key: string): Promise<string> {
    if (this.dataloader) {
      return this.dataloader.load(key);
    }
    const params: DynamoDB.DocumentClient.GetItemInput = {
      Key: {
        [this.options.partitionKeyName]: key,
      },
      TableName: this.options.tableName,
    };
    return this.client
      .get(params)
      .promise()
      .then(({ Item = {} }) => Item[this.options.valueAttribute]);
  }

  public async set(key: string, value: string, options?: { ttl?: number }): Promise<void> {
    const epochSeconds = this.calculateTTL(options);
    if (epochSeconds === undefined) {
      return new Promise(resolve => resolve());
    }
    const params: DynamoDB.DocumentClient.PutItemInput = {
      Item: {
        [this.options.partitionKeyName]: key,
        [this.options.valueAttribute]: value,
        [this.options.ttlAttribute]: epochSeconds,
      },
      TableName: this.options.tableName,
    };

    return this.client
      .put(params)
      .promise()
      .then(() => {
        if (this.dataloader) {
          this.dataloader.clear(key).prime(key, value);
        }
      });
  }

  public async delete(key: string): Promise<boolean | void> {
    const params: DynamoDB.DocumentClient.DeleteItemInput = {
      Key: {
        [this.options.partitionKeyName]: key,
      },
      TableName: this.options.tableName,
    };
    return this.client
      .delete(params)
      .promise()
      .then(() => {
        if (this.dataloader) {
          this.dataloader.clear(key);
        }
      });
  }

  private calculateTTL(options: { ttl?: number } = {}) {
    const { ttl = this.options.defaultTTL } = options;
    if (ttl <= 0) {
      return undefined;
    }
    const epochSeconds = Math.floor(Date.now() / 1000) + ttl;
    return epochSeconds;
  }
}
