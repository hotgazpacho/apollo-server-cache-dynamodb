export default {
  tables: [
    {
      TableName: 'KeyValueCache',
      KeySchema: [{ AttributeName: 'CacheKey', KeyType: 'HASH' }],
      AttributeDefinitions: [{ AttributeName: 'CacheKey', AttributeType: 'S' }],
      BillingMode: 'PAY_PER_REQUEST',
      data: [
        { CacheKey: 'hello', CacheTTL: new Date('2019-02-20T12:05:00.000Z').getTime() / 1000, CacheValue: 'world' },
      ],
    },
    {
      TableName: 'FancyCacheTable',
      KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }, { AttributeName: 'sk', KeyType: 'RANGE' }],
      AttributeDefinitions: [{ AttributeName: 'pk', AttributeType: 'S' }, { AttributeName: 'sk', AttributeType: 'S' }],
      BillingMode: 'PAY_PER_REQUEST',
      data: [
        {
          pk: 'hello',
          sk: 'apq',
          ttl: new Date('2019-02-20T12:05:00.000Z').getTime() / 1000,
          hash: 'world',
        },
      ],
    },
  ],
  basePort: 8888,
};
