// tslint:disable: no-empty
import { KeyValueCache } from 'apollo-server-caching';
import DynamoDB = require('aws-sdk/clients/dynamodb');

export default class DynamoDBCache implements KeyValueCache {
  private client: DynamoDB.DocumentClient;
  private tableName: string;
  private partitionKeyName: string;
  private valueAttribute: string;
  private ttlAttribute: string;

  constructor(
    client: DynamoDB.DocumentClient,
    tableName: string = 'KeyValueCache',
    partitionKeyName: string = 'CacheKey',
    valueAttribute: string = 'CacheValue',
    ttlAttribute: string = 'CacheTTL',
  ) {
    this.client = client;
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
