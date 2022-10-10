import mysql from 'mysql2';

class DatabaseError extends Error {
  constructor(message) {
    super();
    this.message = message;
    this.name = 'DatabaseError';
  }
}

class MySQLClient {
  constructor(config) {
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectionLimit: 100,
      connectTimeout: 2000,
      multipleStatements: true,
    });
    this.pool.on('error', (error) => {
      console.error(error);
    });
  }

  async query(query, values) {
    if (typeof query != 'string') {
      throw new DatabaseError('query must typeof string');
    }
    if (values) {
      if (!(values instanceof Array)) {
        throw new DatabaseError('values must instanceof Array');
      }
      for (let i = 0; i < values.length; i++) {
        if (values[i] == undefined) {
          throw new DatabaseError('index ' + i + ' of values is undefined');
        }
      }
    }
    const result = await this.pool.promise().execute(query, values);
    return result[0];
  }
}

let defaultClient = {};

export default class {
  constructor(config) {
    return new MySQLClient(config);
  }

  static async query(query, values) {
    return await defaultClient.query(query, values);
  }

  static set(client) {
    defaultClient = client;
  }

  static get() {
    return defaultClient;
  }
}
