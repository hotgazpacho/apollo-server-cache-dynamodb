# apollo-server-cache-dynamodb

[![npm version](https://badge.fury.io/js/apollo-server-cache-dynamodb.svg)](https://badge.fury.io/js/apollo-server-cache-dynamodb)
[![CircleCI](https://circleci.com/gh/hotgazpacho/apollo-server-cache-dynamodb.svg?style=svg)](https://circleci.com/gh/hotgazpacho/apollo-server-cache-dynamodb)

This package exports an implementation of `KeyValueCache` that allows using AWS DynamoDB as a backing store for resource caching in [Data Sources](https://www.apollographql.com/docs/apollo-server/v2/features/data-sources.html).

## Important Note!

`@aws-sdk/client-dynamodb` is included as a `peerDependency` in order to help keep the package size small for deployment to AWS Lambda environments,
where the sdk is available as part of the runtime.

## Usage

```js
const DynamoDBClient = require('@aws-sdk/client-dynamodb');
const { DynamoDBCache } = require('apollo-server-cache-dynamodb');

const client = new DynamoDBClient();
const cacheOpts = {
  tableName: 'KeyValueCache', // default, table name
  partitionKeyName: 'CacheKey', // default, partition key, must be type S
  valueAttribute: 'CacheValue', // default, value attribute, must be type S
  ttlAttribute: 'CacheTTL', // default, ttl attribute, must be type N
  defaultTTL: 300, // default, ttl in seconds
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  cache: new DynamoDBCache(client, cacheOpts),
  dataSources: () => ({
    moviesAPI: new MoviesAPI(),
  }),
});
```
