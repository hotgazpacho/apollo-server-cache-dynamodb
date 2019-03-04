const DEFAULT_TABLE_NAME = 'KeyValueCache';
const DEFAULT_PARTITION_KEY = 'CacheKey';
const DEFAULT_VALUE_ATTRIBUTE = 'CacheValue';
const DEFAULT_TTL_ATTRIBUTE = 'CacheTTL';
const DEFAULT_TTL = 300;

export interface IDynamoDBCacheOptions {
  tableName: string;
  partitionKeyName: string;
  valueAttribute: string;
  ttlAttribute: string;
  defaultTTL: number;
}

export class DynamoDBCacheOptions implements IDynamoDBCacheOptions {
  // tslint:disable: variable-name
  private _tableName: string;
  private _partitionKeyName: string;
  private _valueAttribute: string;
  private _ttlAttribute: string;
  private _defaultTTL: number;
  // tslint:enable: variable-name

  constructor(
    options: {
      tableName?: string;
      partitionKeyName?: string;
      valueAttribute?: string;
      ttlAttribute?: string;
      defaultTTL?: number;
    } = {},
  ) {
    const {
      tableName = DEFAULT_TABLE_NAME,
      partitionKeyName = DEFAULT_PARTITION_KEY,
      valueAttribute = DEFAULT_VALUE_ATTRIBUTE,
      ttlAttribute = DEFAULT_TTL_ATTRIBUTE,
      defaultTTL = DEFAULT_TTL,
    } = options;

    this._tableName = tableName;
    this._partitionKeyName = partitionKeyName;
    this._valueAttribute = valueAttribute;
    this._ttlAttribute = ttlAttribute;
    this._defaultTTL = defaultTTL;
  }

  public get tableName(): string {
    return this._tableName;
  }

  public get partitionKeyName(): string {
    return this._partitionKeyName;
  }

  public get valueAttribute(): string {
    return this._valueAttribute;
  }

  public get ttlAttribute(): string {
    return this._ttlAttribute;
  }

  public get defaultTTL(): number {
    return this._defaultTTL;
  }
}
