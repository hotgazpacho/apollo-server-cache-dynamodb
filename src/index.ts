// tslint:disable: no-empty
import { KeyValueCache } from 'apollo-server-caching';
import { DeleteItemCommand, DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';

const DEFAULT_TABLE_NAME = 'KeyValueCache';
const DEFAULT_PARTITION_KEY = 'CacheKey';
const DEFAULT_VALUE_ATTRIBUTE = 'CacheValue';
const DEFAULT_TTL_ATTRIBUTE = 'CacheTTL';
const DEFAULT_TTL = 300;

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface DynamoDBCacheOptions {
  tableName?: string;
  partitionKeyName?: string;
  valueAttribute?: string;
  ttlAttribute?: string;
  defaultTTL?: number;
}

export class DynamoDBCache implements KeyValueCache {
  private client: DynamoDBClient;
  private tableName: string;
  private partitionKeyName: string;
  private valueAttribute: string;
  private ttlAttribute: string;
  private defaultTTL: number;

  constructor(client: DynamoDBClient, options: DynamoDBCacheOptions = {}) {
    this.client = client;

    const {
      tableName = DEFAULT_TABLE_NAME,
      partitionKeyName = DEFAULT_PARTITION_KEY,
      valueAttribute = DEFAULT_VALUE_ATTRIBUTE,
      ttlAttribute = DEFAULT_TTL_ATTRIBUTE,
      defaultTTL = DEFAULT_TTL,
    } = options;

    this.tableName = tableName;
    this.partitionKeyName = partitionKeyName;
    this.valueAttribute = valueAttribute;
    this.ttlAttribute = ttlAttribute;
    this.defaultTTL = defaultTTL;
  }

  public get(key: string): Promise<string | undefined> {
    const command = new GetItemCommand({
      Key: {
        [this.partitionKeyName]: { S: key },
      },
      TableName: this.tableName,
    });
    return this.client.send(command).then(({ Item }) => {
      // since DynamoDB itself doesnt really clean up items with TTL in a reliable, timely fashion
      // we need to manually check if the cached value should still be alive
      if (!Item) {
        return undefined;
      }
      const ttlString = Item[this.ttlAttribute]?.N;
      const ttl = ttlString && parseInt(ttlString);
      if (!ttl || ttl >= Math.floor(Date.now() / 1000)) {
        return Item[this.valueAttribute].S;
      }
      return undefined;
    });
  }

  public set(key: string, value: string, options?: { ttl?: number }): Promise<void> {
    const epochSeconds = this.calculateTTL(options);
    if (epochSeconds === undefined) {
      return new Promise((resolve) => resolve());
    }
    const command = new PutItemCommand({
      Item: {
        [this.partitionKeyName]: { S: key },
        [this.valueAttribute]: { S: value },
        [this.ttlAttribute]: { N: epochSeconds.toString() },
      },
      TableName: this.tableName,
    });

    return this.client.send(command).then(() => {});
  }

  public delete(key: string): Promise<boolean | void> {
    const command = new DeleteItemCommand({
      Key: {
        [this.partitionKeyName]: { S: key },
      },
      TableName: this.tableName,
    });
    return this.client.send(command).then(() => {});
  }

  private calculateTTL(options: { ttl?: number } = {}) {
    const { ttl = this.defaultTTL } = options;
    if (ttl <= 0) {
      return undefined;
    }
    const epochSeconds = Math.floor(Date.now() / 1000) + ttl;
    return epochSeconds;
  }
}
