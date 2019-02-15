import { KeyValueCache } from "apollo-server-caching";
import { DynamoDB } from "aws-sdk";

export default class DynamoDBCache implements KeyValueCache {
  private client: DynamoDB.DocumentClient;
  private tableName: string;
  private partitionKeyName: string;
  private valueAttribute: string;
  private ttlAttribute: string;

  constructor(
    client: DynamoDB.DocumentClient,
    tableName: string = "KeyValueCache",
    partitionKeyName: string = "CacheKey",
    valueAttribute: string = "CacheValue",
    ttlAttribute: string = "CacheTTL"
  ) {
    this.client = client;
    this.tableName = tableName;
    this.partitionKeyName = partitionKeyName;
    this.valueAttribute = valueAttribute;
    this.ttlAttribute = ttlAttribute;
  }

  get(key: string): Promise<string> {
    const params: DynamoDB.DocumentClient.GetItemInput = {
      TableName: this.tableName,
      Key: {
        [this.partitionKeyName]: key
      }
    };
    return this.client
      .get(params)
      .promise()
      .then(({ Item = {} }) => Item[this.valueAttribute]);
  }

  set(key: string, value: string, options?: { ttl?: number }): Promise<void> {
    const params: DynamoDB.DocumentClient.PutItemInput = {
      TableName: this.tableName,
      Item: {
        [this.partitionKeyName]: key,
        [this.valueAttribute]: value
      }
    };
    if (options && options.ttl) {
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + options.ttl);
      params.Item[this.ttlAttribute] = Math.floor(expiresAt.getTime() / 1000);
    }
    return this.client
      .put(params)
      .promise()
      .then(() => {});
  }

  delete(key: string): Promise<boolean | void> {
    const params: DynamoDB.DocumentClient.DeleteItemInput = {
      TableName: this.tableName,
      Key: {
        [this.partitionKeyName]: key
      }
    };
    return this.client
      .delete(params)
      .promise()
      .then(() => {});
  }
}
