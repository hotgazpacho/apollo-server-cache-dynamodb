import { KeyValueCache } from '@apollo/utils.keyvaluecache';
import AWS from 'aws-sdk';
import AWSMock from 'aws-sdk-mock';
import { advanceTo, clear } from 'jest-date-mock';
import { DynamoDBCache } from './index';

AWSMock.setSDKInstance(AWS);

describe('DynamoDBCache', () => {
  let keyValueCache: KeyValueCache;
  let client: AWS.DynamoDB.DocumentClient;

  const TableName = 'KeyValueCache';

  beforeAll(async () => {
    AWS.config.update({
      accessKeyId: 'LOCAL_ACCESS_KEY_ID',
      secretAccessKey: 'LOCAL_SECRET_ACCESS_KEY',
      region: 'local',
      dynamodb: {
        endpoint: 'http://localhost:8000',
      },
    });
  });

  describe('basic cache functionality', () => {
    afterEach(() => {
      AWSMock.restore();
    });

    describe('get', () => {
      it('can retrieve an existing key', async () => {
        AWSMock.mock('DynamoDB.DocumentClient', 'get', (params, callback) => {
          expect(params).toEqual({
            TableName,
            Key: {
              CacheKey: 'hello',
            },
          });
          callback(null, { Item: { CacheValue: 'world' } });
        });
        client = new AWS.DynamoDB.DocumentClient();
        keyValueCache = new DynamoDBCache(client);
        expect(await keyValueCache.get('hello')).toBe('world');
      });

      it('returns undefined for a non-existant key', async () => {
        AWSMock.mock('DynamoDB.DocumentClient', 'get', (params, callback) => {
          expect(params).toEqual({
            TableName,
            Key: {
              CacheKey: 'missing',
            },
          });
          callback(null, {});
        });
        client = new AWS.DynamoDB.DocumentClient();
        keyValueCache = new DynamoDBCache(client);
        expect(await keyValueCache.get('missing')).toBeUndefined();
      });

      it('can retrieve an existing key with ttl', async () => {
        const now = new Date(2019, 2, 20, 12, 0, 0);
        const ttl = new Date(2019, 2, 20, 12, 5);
        advanceTo(now);
        AWSMock.mock('DynamoDB.DocumentClient', 'get', (params, callback) => {
          const Item = {
            CacheKey: 'hello',
            CacheValue: 'world',
            CacheTTL: ttl.getTime() / 1000,
          };
          expect(params).toEqual({
            TableName,
            Key: {
              CacheKey: Item.CacheKey,
            },
          });
          callback(null, { Item });
        });
        client = new AWS.DynamoDB.DocumentClient();
        keyValueCache = new DynamoDBCache(client);
        expect(await keyValueCache.get('hello')).toBe('world');
      });

      it('omits an existing key which ttl expired', async () => {
        const now = new Date(2019, 2, 20, 12, 0, 0);
        const ttl = new Date(2019, 2, 20, 11, 5);
        advanceTo(now);
        AWSMock.mock('DynamoDB.DocumentClient', 'get', (params, callback) => {
          const Item = {
            CacheKey: 'hello',
            CacheValue: 'world',
            CacheTTL: ttl.getTime() / 1000,
          };
          expect(params).toEqual({
            TableName,
            Key: {
              CacheKey: Item.CacheKey,
            },
          });
          callback(null, { Item });
        });
        client = new AWS.DynamoDB.DocumentClient();
        keyValueCache = new DynamoDBCache(client);
        expect(await keyValueCache.get('hello')).toBeUndefined();
      });
    });

    describe('set', () => {
      afterEach(() => {
        clear();
      });

      it('can do a basic set with the default ttl', async () => {
        const now = new Date(2019, 2, 20, 12, 0, 0);
        const ttl = new Date(2019, 2, 20, 12, 5);
        advanceTo(now);
        AWSMock.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
          const Item = {
            CacheKey: 'hello',
            CacheValue: 'world',
            CacheTTL: ttl.getTime() / 1000,
          };
          expect(params).toEqual({
            TableName,
            Item,
          });
          callback(null, Item);
        });

        client = new AWS.DynamoDB.DocumentClient();
        keyValueCache = new DynamoDBCache(client);
        await keyValueCache.set('hello', 'world');
        expect.assertions(1);
      });

      describe('with an explicit, non-zero TTL', () => {
        it('performs no rounding when there are no milliseconds', async () => {
          const now = new Date(2019, 2, 20, 12, 0, 0);
          const ttl = new Date(2019, 2, 20, 12, 10);
          advanceTo(now);
          AWSMock.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
            const Item = {
              CacheKey: 'hello',
              CacheValue: 'world',
              CacheTTL: ttl.getTime() / 1000,
            };
            expect(params).toEqual({
              TableName,
              Item,
            });
            callback(null, Item);
          });

          client = new AWS.DynamoDB.DocumentClient();
          keyValueCache = new DynamoDBCache(client);
          await keyValueCache.set('hello', 'world', { ttl: 600 });
          expect.assertions(1);
        });

        it('rounds down on partial seconds', async () => {
          const now = new Date(2019, 2, 20, 12, 0, 0, 999);
          const ttl = new Date(2019, 2, 20, 12, 10);
          advanceTo(now);
          AWSMock.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
            const Item = {
              CacheKey: 'hello',
              CacheValue: 'world',
              CacheTTL: ttl.getTime() / 1000,
            };
            expect(params).toEqual({
              TableName,
              Item,
            });
            callback(null, Item);
          });

          client = new AWS.DynamoDB.DocumentClient();
          keyValueCache = new DynamoDBCache(client);
          await keyValueCache.set('hello', 'world', { ttl: 600 });
          expect.assertions(1);
        });
      });

      describe('with an explicit zero ttl', () => {
        it('does not store the value in DynamoDB', async () => {
          const now = new Date(2019, 2, 20, 12, 0, 0);
          advanceTo(now);

          const putStub = jest.fn((params, callback) => callback(false));
          AWSMock.mock('DynamoDB.DocumentClient', 'put', putStub);

          client = new AWS.DynamoDB.DocumentClient();
          keyValueCache = new DynamoDBCache(client);
          await keyValueCache.set('hello', 'world', { ttl: 0 });
          expect(putStub).not.toHaveBeenCalled();
        });
      });

      describe('with an explicit negative ttl', () => {
        it('does not store the value in DynamoDB', async () => {
          const now = new Date(2019, 2, 20, 12, 0, 0);
          advanceTo(now);

          const putStub = jest.fn((params, callback) => callback(false));
          AWSMock.mock('DynamoDB.DocumentClient', 'put', putStub);

          client = new AWS.DynamoDB.DocumentClient();
          keyValueCache = new DynamoDBCache(client);
          await keyValueCache.set('hello', 'world', { ttl: -1 });
          expect(putStub).not.toHaveBeenCalled();
        });
      });
    });

    describe('delete', () => {
      it('deletes an existing key', async () => {
        AWSMock.mock('DynamoDB.DocumentClient', 'delete', (params, callback) => {
          const Key = {
            CacheKey: 'hello',
          };
          expect(params).toEqual({
            TableName,
            Key,
          });
          callback(null, {});
        });
        client = new AWS.DynamoDB.DocumentClient();
        keyValueCache = new DynamoDBCache(client);
        await keyValueCache.delete('hello');
        expect.assertions(1);
      });
    });
  });
});
