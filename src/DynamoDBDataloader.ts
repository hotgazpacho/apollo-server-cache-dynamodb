import DynamoDB = require('aws-sdk/clients/dynamodb');
import Dataloader from 'dataloader';
import { DynamoDBCacheOptions, IDynamoDBCacheOptions } from './DynamoDBCacheOptions';

export function createDataloader(
  client: DynamoDB.DocumentClient,
  options: IDynamoDBCacheOptions = new DynamoDBCacheOptions(),
): Dataloader<string, string> {
  async function batchGetCacheValues(keys: string[]): Promise<any[]> {
    const params = buildBatchGetParams(options, keys);
    const data = await client.batchGet(params).promise();
    // TODO: UnprocessedKeys handling per https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Programming.Errors.html#Programming.Errors.BatchOperations
    const responses = data.Responses || {};
    const cachedValues = responses[options.tableName];
    return mapCachedValuesFromKeys(keys, cachedValues, options);
  }

  return new Dataloader(keys => batchGetCacheValues(keys), { maxBatchSize: 100 });
}

function mapCachedValuesFromKeys(
  keys: string[],
  cachedValues: DynamoDB.DocumentClient.AttributeMap[],
  options: IDynamoDBCacheOptions,
) {
  return keys.map(key => {
    const matchingValue = cachedValues.find(cv => cv[options.partitionKeyName] === key);
    if (matchingValue) {
      return matchingValue[options.valueAttribute];
    } else {
      return null;
    }
  });
}

function buildBatchGetParams(options: IDynamoDBCacheOptions, keys: string[]) {
  return {
    RequestItems: {
      [options.tableName]: {
        ExpressionAttributeNames: {
          '#key': options.partitionKeyName,
          '#value': options.valueAttribute,
        },
        Keys: keys.map(key => ({ [options.partitionKeyName]: key })),
        ProjectionExpression: '#key, #value',
      },
    },
  };
}
