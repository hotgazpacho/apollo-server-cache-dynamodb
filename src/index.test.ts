import { KeyValueCache } from 'apollo-server-caching';
import { mockClient } from 'aws-sdk-client-mock';
import { DeleteItemCommand, DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { advanceTo, clear } from 'jest-date-mock';
import { DynamoDBCache } from './index';

describe('DynamoDBCache', () => {
  let keyValueCache: KeyValueCache;
  const dynamoDB = new DynamoDBClient({
    credentials: {
      accessKeyId: 'LOCAL_ACCESS_KEY_ID',
      secretAccessKey: 'LOCAL_SECRET_ACCESS_KEY',
    },
    region: 'local',
    endpoint: 'http://localhost:8000',
  });
  const dynamoDBMock = mockClient(dynamoDB);
  let client = dynamoDBMock as any;
  const TableName = 'KeyValueCache';

  describe('basic cache functionality', () => {
    afterEach(() => {
      dynamoDBMock.reset();
    });

    describe('get', () => {
      it('can retrieve an existing key', async () => {
        client
          .on(GetItemCommand, {
            TableName,
            Key: {
              CacheKey: { S: 'hello' },
            },
          })
          .resolves({
            Item: { CacheValue: { S: 'world' } },
          });
        keyValueCache = new DynamoDBCache(client);
        expect(await keyValueCache.get('hello')).toBe('world');
      });

      it('returns undefined for a non-existant key', async () => {
        client
          .on(GetItemCommand, {
            TableName,
            Key: {
              CacheKey: { S: 'missing' },
            },
          })
          .resolves({
            Item: undefined,
          });
        keyValueCache = new DynamoDBCache(client);
        expect(await keyValueCache.get('missing')).toBeUndefined();
      });

      it('can retrieve an existing key with ttl', async () => {
        const now = new Date(2019, 2, 20, 12, 0, 0);
        const ttl = new Date(2019, 2, 20, 12, 5);
        advanceTo(now);
        const Item = {
          CacheKey: { S: 'hello' },
          CacheValue: { S: 'world' },
          CacheTTL: { N: (ttl.getTime() / 1000).toString() },
        };
        client
          .on(GetItemCommand, {
            TableName,
            Key: {
              CacheKey: Item.CacheKey,
            },
          })
          .resolves({
            Item,
          });
        keyValueCache = new DynamoDBCache(client);
        expect(await keyValueCache.get('hello')).toBe('world');
      });

      it('omits an existing key which ttl expired', async () => {
        const now = new Date(2019, 2, 20, 12, 0, 0);
        const ttl = new Date(2019, 2, 20, 11, 5);
        advanceTo(now);
        const Item = {
          CacheKey: { S: 'hello' },
          CacheValue: { S: 'world' },
          CacheTTL: { N: (ttl.getTime() / 1000).toString() },
        };
        client
          .on(GetItemCommand, {
            TableName,
            Key: {
              CacheKey: Item.CacheKey,
            },
          })
          .resolves({
            Item,
          });
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
        const Item = {
          CacheKey: { S: 'hello' },
          CacheValue: { S: 'world' },
          CacheTTL: { N: (ttl.getTime() / 1000).toString() },
        };
        client
          .on(PutItemCommand, {
            TableName,
            Item,
          })
          .resolves({
            Item,
          });
        keyValueCache = new DynamoDBCache(client);
        await keyValueCache.set('hello', 'world');
        expect(dynamoDBMock.commandCalls(PutItemCommand)).toHaveLength(1);
      });

      describe('with an explicit, non-zero TTL', () => {
        it('performs no rounding when there are no milliseconds', async () => {
          const now = new Date(2019, 2, 20, 12, 0, 0);
          const ttl = new Date(2019, 2, 20, 12, 10);
          advanceTo(now);
          const Item = {
            CacheKey: { S: 'hello' },
            CacheValue: { S: 'world' },
            CacheTTL: { N: (ttl.getTime() / 1000).toString() },
          };
          client
            .on(PutItemCommand, {
              TableName,
              Item,
            })
            .resolves({
              Item,
            });
          keyValueCache = new DynamoDBCache(client);
          await keyValueCache.set('hello', 'world', { ttl: 600 });
          expect(dynamoDBMock.commandCalls(PutItemCommand, { TableName, Item })).toHaveLength(1);
        });

        it('rounds down on partial seconds', async () => {
          const now = new Date(2019, 2, 20, 12, 0, 0, 999);
          const ttl = new Date(2019, 2, 20, 12, 10);
          advanceTo(now);
          const Item = {
            CacheKey: { S: 'hello' },
            CacheValue: { S: 'world' },
            CacheTTL: { N: (ttl.getTime() / 1000).toString() },
          };
          client
            .on(PutItemCommand, {
              TableName,
              Item,
            })
            .resolves({
              Item,
            });

          keyValueCache = new DynamoDBCache(client);
          await keyValueCache.set('hello', 'world', { ttl: 600 });
          expect(dynamoDBMock.commandCalls(PutItemCommand, { TableName, Item })).toHaveLength(1);
        });
      });

      describe('with an explicit zero ttl', () => {
        it('does not store the value in DynamoDB', async () => {
          const now = new Date(2019, 2, 20, 12, 0, 0);
          advanceTo(now);
          keyValueCache = new DynamoDBCache(client);
          await keyValueCache.set('hello', 'world', { ttl: 0 });
          expect(dynamoDBMock.calls()).toHaveLength(0);
        });
      });

      describe('with an explicit negative ttl', () => {
        it('does not store the value in DynamoDB', async () => {
          const now = new Date(2019, 2, 20, 12, 0, 0);
          advanceTo(now);
          keyValueCache = new DynamoDBCache(client);
          await keyValueCache.set('hello', 'world', { ttl: -1 });
          expect(dynamoDBMock.calls()).toHaveLength(0);
        });
      });
    });

    describe('delete', () => {
      it('deletes an existing key', async () => {
        const Key = {
          CacheKey: { S: 'hello' },
        };
        client.on(DeleteItemCommand).resolves({});
        keyValueCache = new DynamoDBCache(client);
        await keyValueCache.delete('hello');
        expect(
          dynamoDBMock.commandCalls(DeleteItemCommand, {
            TableName,
            Key,
          }),
        ).toHaveLength(1);
      });
    });
  });
});
