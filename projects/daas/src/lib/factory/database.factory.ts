import {DatabaseAdapter, DatabaseBasicOptions, DatabaseUpdateOptions, DatabaseWriteOptions} from '../adapters/database.adapter';
import {ChangeEvent, MongoClient} from 'mongodb';
import {BasicAttributesModel} from '../model/basic-attributes.model';
import {ContextBlock} from '../model/rules.model';
import {QueryModel} from '../model/query-model';
import {UpdateRuleRequestModel} from '../model/update-rule-request.model';
import {DeleteModel} from '../model/delete-model';
import {BFastDatabaseConfigAdapter} from '../bfast.config';

export class DatabaseFactory implements DatabaseAdapter {
  private mongoClient: MongoClient;

  constructor(private readonly config: BFastDatabaseConfigAdapter) {
  }

  async writeMany<T extends BasicAttributesModel, V>(domain: string, data: T[], context: ContextBlock, options?: DatabaseWriteOptions)
    : Promise<V> {
    const conn = await this.connection();
    const response = await conn.db().collection(domain).insertMany(data, {
      session: options && options.transaction ? options.transaction : undefined
    });
    conn.close().catch(console.warn);
    return response.insertedIds as any;
  }

  async writeOne<T extends BasicAttributesModel>(domain: string, data: T, context: ContextBlock, options?: DatabaseWriteOptions)
    : Promise<any> {
    const conn = await this.connection();
    const response = await conn.db().collection(domain).insertOne(data, {
      w: 'majority',
      session: options && options.transaction ? options.transaction : undefined
    });
    return response.insertedId;
  }

  private async connection(): Promise<MongoClient> {
    if (this.mongoClient && this.mongoClient.isConnected()) {
      return this.mongoClient;
    } else {
      const mongoUri = this.config.mongoDbUri;
      return new MongoClient(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }).connect();
    }
  }

  async init(): Promise<any> {
    try {
      await this.dropIndexes('_User');
    } catch (_) {
    }
    return await this.createIndexes('_User', [
      {
        field: 'email',
        unique: true,
        collation: {
          locale: 'en',
          strength: 2
        }
      },
      {
        field: 'username',
        unique: true,
        collation: {
          locale: 'en',
          strength: 2
        }
      }
    ]);
  }

  async createIndexes(domain: string, indexes: any[]): Promise<any> {
    if (indexes && Array.isArray(indexes)) {
      const conn = await this.connection();
      for (const value of indexes) {
        const indexOptions: any = {};
        Object.assign(indexOptions, value);
        delete indexOptions.field;
        await conn.db().collection(domain).createIndex({[value.field]: 1}, indexOptions);
      }
      await conn.close(); // .catch(console.warn);
      return 'Indexes added';
    } else {
      throw new Error('Must supply array of indexes to be added');
    }
  }

  async dropIndexes(domain: string): Promise<boolean> {
    const conn = await this.connection();
    const result = await conn.db().collection(domain).dropIndexes();
    await conn.close();
    return result;
  }

  async listIndexes(domain: string): Promise<any[]> {
    const conn = await this.connection();
    const indexes = await conn.db().collection(domain).listIndexes().toArray();
    await conn.close();
    return indexes;
  }

  async findOne<T extends BasicAttributesModel>(domain: string, queryModel: QueryModel<T>,
                                                context: ContextBlock, options?: DatabaseWriteOptions): Promise<any> {
    const conn = await this.connection();
    const fieldsToReturn = {};
    if (queryModel?.return && Array.isArray(queryModel?.return) && queryModel.return.length > 0) {
      queryModel.return.forEach(x => {
        fieldsToReturn[x] = 1;
      });
    }
    const result = await conn.db().collection(domain).findOne<T>({_id: queryModel._id}, {
      session: options && options.transaction ? options.transaction : undefined,
      projection: fieldsToReturn
    });
    await conn.close();
    return result;
  }

  async query<T extends BasicAttributesModel>(domain: string, queryModel: QueryModel<T>,
                                              context: ContextBlock, options?: DatabaseWriteOptions): Promise<any> {
    const conn = await this.connection();
    const query = conn.db().collection(domain).find(queryModel.filter, {
      session: options && options.transaction ? options.transaction : undefined
    });
    if (queryModel.skip) {
      query.skip(queryModel.skip);
    } else {
      query.skip(0);
    }
    if (queryModel.size) {
      if (queryModel.size !== -1) {
        query.limit(queryModel.size);
      }
    } else {
      if (!queryModel.count) {
        query.limit(50);
      }
    }
    if (queryModel.orderBy && Array.isArray(queryModel.orderBy) && queryModel.orderBy?.length > 0) {
      queryModel.orderBy.forEach(value => {
        query.sort(value);
      });
    }
    if (queryModel.return && Array.isArray(queryModel.return) && queryModel.return.length > 0) {
      const fieldsToReturn = {};
      queryModel.return.forEach(x => {
        fieldsToReturn[x] = 1;
      });
      query.project(fieldsToReturn);
    }
    let result;
    if (queryModel?.count === true) {
      result = await query.count();
    } else {
      result = await query.toArray();
    }
    await conn.close();
    return result;
  }

  async update<T extends BasicAttributesModel, V>(domain: string, updateModel: UpdateRuleRequestModel,
                                                  context: ContextBlock, options?: DatabaseUpdateOptions): Promise<V> {
    const conn = await this.connection();
    const response = await conn.db().collection(domain).findOneAndUpdate(updateModel.filter, updateModel.update, {
      upsert: false, // updateModel.upsert === true,
      returnOriginal: false,
      session: options && options.transaction ? options.transaction : undefined
    });
    await conn.close();
    return response.value;
  }

  async deleteOne<T extends BasicAttributesModel, V>(domain: string, deleteModel: DeleteModel<T>,
                                                     context: ContextBlock, options?: DatabaseBasicOptions): Promise<V> {
    const conn = await this.connection();
    const response = await conn.db()
      .collection(domain)
      .findOneAndDelete(deleteModel.filter, {
        session: options && options.transaction ? options.transaction : undefined
      });
    await conn.close();
    return response.value as any;
  }

  async transaction<V>(operations: (session: any) => Promise<any>): Promise<any> {
    const conn = await this.connection();
    const session = conn.startSession();
    try {
      await session.withTransaction(async _ => {
        return await operations(session);
      }, {
        readPreference: 'primary',
        readConcern: {
          level: 'local'
        },
        writeConcern: {
          w: 'majority'
        }
      });
    } finally {
      await session.endSession();
    }
    await conn.close();
  }

  async aggregate(domain: string, pipelines: any[], context: ContextBlock, options?: DatabaseWriteOptions): Promise<any> {
    const conn = await this.connection();
    const result = await conn.db().collection(domain).aggregate(pipelines).toArray();
    await conn.close();
    return result;
  }

  async changes(domain: string, pipeline: any[], listener: (doc: ChangeEvent) => void): Promise<any> {
    const conn = await this.connection();
    conn.db().collection(domain).watch(pipeline, {fullDocument: 'updateLookup'}).on('change', doc => {
      listener(doc);
    });
    return;
  }
}
