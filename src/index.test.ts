import DynamoDBCache from "./index";
import { KeyValueCache } from "apollo-server-caching";
import AWS = require("aws-sdk");
import DynamoDBLocal = require("dynamodb-local");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe("DynamoDBCache", () => {
  let ddbLocal;
  let keyValueCache: KeyValueCache;
  let client: AWS.DynamoDB.DocumentClient;

  beforeAll(async () => {
    ddbLocal = await DynamoDBLocal.launch(
      8000,
      null,
      ["-sharedDb", "-inMemory"],
      true
    );
    AWS.config.update({
      accessKeyId: "LOCAL_ACCESS_KEY_ID",
      secretAccessKey: "LOCAL_SECRET_ACCESS_KEY",
      region: "local",
      dynamodb: {
        endpoint: "http://localhost:8000"
      }
    });
  });

  afterAll(() => {
    DynamoDBLocal.stop(8000);
  });

  beforeEach(async () => {
    const ddb = new AWS.DynamoDB();

    const createTableParams: AWS.DynamoDB.CreateTableInput = {
      TableName: "KeyValueCache",
      KeySchema: [{ AttributeName: "CacheKey", KeyType: "HASH" }],
      AttributeDefinitions: [{ AttributeName: "CacheKey", AttributeType: "S" }],
      BillingMode: "PAY_PER_REQUEST"
    };
    await ddb.createTable(createTableParams).promise();

    const ttlParams: AWS.DynamoDB.UpdateTimeToLiveInput = {
      TableName: "KeyValueCache",
      TimeToLiveSpecification: {
        AttributeName: "CacheTTL",
        Enabled: true
      }
    };
    await ddb.updateTimeToLive(ttlParams).promise();

    client = new AWS.DynamoDB.DocumentClient();
    keyValueCache = new DynamoDBCache(client);
  });

  afterEach(async () => {
    const ddb = new AWS.DynamoDB();
    const deleteTableParams: AWS.DynamoDB.DeleteTableInput = {
      TableName: "KeyValueCache"
    };
    await ddb.deleteTable(deleteTableParams).promise();
  });

  describe("basic cache functionality", () => {
    it("can do a basic get and set", async () => {
      await keyValueCache.set("hello", "world");
      expect(await keyValueCache.get("hello")).toBe("world");
      expect(await keyValueCache.get("missing")).toBeUndefined();
    });

    it("can do a basic set and delete", async () => {
      await keyValueCache.set("hello", "world");
      expect(await keyValueCache.get("hello")).toBe("world");
      await keyValueCache.delete("hello");
      expect(await keyValueCache.get("hello")).toBeUndefined();
    });
  });

  describe("time-based cache expunging", () => {
    it("is able to expire keys based on ttl", async () => {
      await keyValueCache.set("short", "s", { ttl: 1 });
      await keyValueCache.set("long", "l", { ttl: 5 });
      expect(await keyValueCache.get("short")).toBe("s");
      expect(await keyValueCache.get("long")).toBe("l");
      await sleep(150);
      expect(await keyValueCache.get("short")).toBeUndefined();
      expect(await keyValueCache.get("long")).toBe("l");
      await sleep(450);
      expect(await keyValueCache.get("short")).toBeUndefined();
      expect(await keyValueCache.get("long")).toBeUndefined();
    });
  });
});
