import MySQLClient from './mysql.mjs';
import { SQLGen } from './mysql.mjs';
import MySQLClass from './class.mjs';

export { MySQLClient, SQLGen, MySQLClass };

let defaultClient = {};

export default class extends MySQLClient {
  constructor(config) {
    return new MySQLClient(config);
  }

  static async query(...args) {
    return await defaultClient.query(...args);
  }

  static set(client) {
    defaultClient = client;
  }

  static get() {
    return defaultClient;
  }
}
