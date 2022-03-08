import { KeyValueCache } from 'apollo-server-caching';
import AWS = require('aws-sdk');
import { advanceTo, clear } from 'jest-date-mock';
import 'jest-dynalite/withDb';
import { DynamoDBCache } from './index';

describe('DynamoDBCache', () => {
  let keyValueCache: KeyValueCache;
  let client: AWS.DynamoDB.DocumentClient;

  const defaultNow = new Date('2019-02-19T12:05:00.000Z');
  const TableName = 'KeyValueCache';

  beforeAll(async () => {
    AWS.config.update({
      accessKeyId: 'LOCAL_ACCESS_KEY_ID',
      secretAccessKey: 'LOCAL_SECRET_ACCESS_KEY',
      region: 'local',
      dynamodb: {
        endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
        sslEnabled: false,
      },
    });
  });

  beforeEach(() => {
    advanceTo(defaultNow);
  });

  afterEach(() => {
    clear();
  });

  describe('basic cache functionality', () => {
    describe('get', () => {
      it('can retrieve an existing key', async () => {
        client = new AWS.DynamoDB.DocumentClient();
        keyValueCache = new DynamoDBCache(client);
        expect(await keyValueCache.get('hello')).toBe('world');
      });

      it('returns undefined for a non-existant key', async () => {
        client = new AWS.DynamoDB.DocumentClient();
        keyValueCache = new DynamoDBCache(client);
        expect(await keyValueCache.get('missing')).toBeUndefined();
      });

      it('can retrieve an existing key with ttl in the future', async () => {
        client = new AWS.DynamoDB.DocumentClient();
        keyValueCache = new DynamoDBCache(client);
        expect(await keyValueCache.get('hello')).toBe('world');
      });

      it('omits an existing key ttl in the past', async () => {
        const now = new Date('2019-02-20T12:06:00.000Z');
        advanceTo(now);

        client = new AWS.DynamoDB.DocumentClient();
        keyValueCache = new DynamoDBCache(client);
        expect(await keyValueCache.get('hello')).toBeUndefined();
      });
    });

    describe('set', () => {
      it('can do a basic set with the default ttl', async () => {
        const now = new Date('2019-02-20T12:00:00.000Z');
        advanceTo(now);

        client = new AWS.DynamoDB.DocumentClient();
        keyValueCache = new DynamoDBCache(client);
        await keyValueCache.set('hello', 'a-whole-new-world');
        expect(await keyValueCache.get('hello')).toBe('a-whole-new-world');
      });

      describe('with an explicit, non-zero TTL', () => {
        it('performs no rounding when there are no milliseconds', async () => {
          const now = new Date('2019-02-20T12:00:00.000Z');
          const ttl = new Date('2019-02-20T12:10:00.000Z');
          advanceTo(now);

          client = new AWS.DynamoDB.DocumentClient();
          const putSpy = jest.spyOn(client, 'put');
          keyValueCache = new DynamoDBCache(client);
          await keyValueCache.set('hello', 'world', { ttl: 600 });
          expect(putSpy).toHaveBeenCalledWith({
            Item: {
              CacheKey: 'hello',
              CacheValue: 'world',
              CacheTTL: ttl.getTime() / 1000,
            },
            TableName,
          });
        });

        it('rounds down on partial seconds', async () => {
          const now = new Date('2019-02-20T12:00:00.999Z');
          const ttl = new Date('2019-02-20T12:10:00.000Z');
          advanceTo(now);

          client = new AWS.DynamoDB.DocumentClient();
          const putSpy = jest.spyOn(client, 'put');
          keyValueCache = new DynamoDBCache(client);
          await keyValueCache.set('hello', 'world', { ttl: 600 });
          expect(putSpy).toHaveBeenCalledWith({
            Item: {
              CacheKey: 'hello',
              CacheValue: 'world',
              CacheTTL: ttl.getTime() / 1000,
            },
            TableName,
          });
        });
      });

      describe('with an explicit zero ttl', () => {
        it('does not store the value in DynamoDB', async () => {
          const now = new Date(2019, 2, 20, 12, 0, 0);
          advanceTo(now);

          client = new AWS.DynamoDB.DocumentClient();
          const putSpy = jest.spyOn(client, 'put');
          keyValueCache = new DynamoDBCache(client);
          await keyValueCache.set('hello', 'world', { ttl: 0 });
          expect(putSpy).not.toHaveBeenCalled();
        });
      });

      describe('with an explicit negative ttl', () => {
        it('does not store the value in DynamoDB', async () => {
          const now = new Date(2019, 2, 20, 12, 0, 0);
          advanceTo(now);

          client = new AWS.DynamoDB.DocumentClient();
          const putSpy = jest.spyOn(client, 'put');
          keyValueCache = new DynamoDBCache(client);
          await keyValueCache.set('hello', 'world', { ttl: -1 });
          expect(putSpy).not.toHaveBeenCalled();
        });
      });
    });

    describe('delete', () => {
      it('deletes an existing key', async () => {
        client = new AWS.DynamoDB.DocumentClient();
        keyValueCache = new DynamoDBCache(client);
        await keyValueCache.delete('hello');
        expect(await keyValueCache.get('hello')).toBeUndefined();
      });
    });
  });

  describe('basic functionality for tables with compound keys', () => {
    describe('get', () => {
      it('can retrieve an existing key', async () => {
        client = new AWS.DynamoDB.DocumentClient();
        keyValueCache = new DynamoDBCache(client, {
          tableName: 'FancyCacheTable',
          partitionKeyName: 'pk',
          sortKeyName: 'sk',
          valueAttribute: 'hash',
          ttlAttribute: 'ttl',
        });
        expect(await keyValueCache.get('hello')).toBe('world');
      });
    });
  });
});
