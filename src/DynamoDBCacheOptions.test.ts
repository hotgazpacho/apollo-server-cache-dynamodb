import { DynamoDBCacheOptions } from './DynamoDBCacheOptions';

describe('DynamoDBCacheOptions', () => {
  it('provides the expected defaults', () => {
    const options = new DynamoDBCacheOptions();
    expect(options).toMatchObject({
      tableName: 'KeyValueCache',
      partitionKeyName: 'CacheKey',
      valueAttribute: 'CacheValue',
      ttlAttribute: 'CacheTTL',
      defaultTTL: 300,
    });
  });

  it('allows overriding the defaults', () => {
    const options = new DynamoDBCacheOptions({
      tableName: 'T',
      partitionKeyName: 'P',
      valueAttribute: 'V',
      ttlAttribute: 'TTL',
      defaultTTL: 42,
    });

    expect(options).toMatchObject({
      tableName: 'T',
      partitionKeyName: 'P',
      valueAttribute: 'V',
      ttlAttribute: 'TTL',
      defaultTTL: 42,
    });
  });
});
