import mysql from 'mysql2';

class MySQLClient {
  constructor(options) {
    this.pool = mysql.createPool({
      host: options.host ? options.host : 'localhost',
      port: options.port ? options.port : 3306,
      user: options.user,
      password: options.password,
      database: options.database,
      connectionLimit: options.limit ? options.limit : 200,
      connectTimeout: options.timeout ? options.timeout : 2000,
      multipleStatements: true,
    });
    this.pool.on('error', (error) => {
      console.error(error);
    });
  }

  async query(query, values) {
    if (typeof query == 'string') {
      if (values) {
        if (!(values instanceof Array)) {
          throw new Error('values must instanceof Array');
        }
        for (let i = 0; i < values.length; i++) {
          if (values[i] === undefined) {
            throw new Error('index ' + i + ' of values is undefined');
          } else if (values[i] instanceof Date) {
            values[i] = values[i].toJSON().replace(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})\.\d{3}Z$/, '$1 $2');
          } else if (values[i] instanceof Object) {
            try {
              values[i] = JSON.stringify(values[i]);
            } catch (error) {
              throw new Error('index ' + i + ' of values is not serializable (' + values[i].constructor.name + ')');
            }
          }
        }
      }
      const result = await this.pool.promise().execute(query, values);
      return result[0];
    } else if (query instanceof Object) {
      const method = query?.method?.toUpperCase();
      switch (method) {
        case 'INSERT': {
          return await this.#insert(query);
        }
        case 'SELECT': {
          return await this.#select(query);
        }
        case 'UPDATE': {
          return await this.#update(query);
        }
        case 'DELETE': {
          return await this.#delete(query);
        }
        default: {
          throw new Error('not executable method (' + method + ')');
        }
      }
    } else {
      throw new Error('unparsable query');
    }
  }

  async #insert(o) {
    const res = await this.query(...this.#insertOf(o));
    return res;
  }

  async #select(o) {
    const res = await this.query(...this.#selectOf(o));
    if (!o.count) {
      const tasks = [];
      for (let i = 0; i < res.length; i++) {
        for (const k in res[i]) {
          tasks.push(
            (async () => {
              res[i][k] = await this.#importsParser(o.imports[k].toLowerCase(), res[i][k]);
            })()
          );
        }
      }
      await Promise.all(tasks);
    } else {
      res = res[0][o.countColumn];
    }
    return res;
  }

  async #update(o) {
    const res = await this.query(...this.#updateOf(o));
    return res;
  }

  async #delete(o) {
    const res = await this.query(...this.#deleteOf(o));
    return res;
  }

  #insertOf(o) {
    let q = ``;
    let v = [];

    q += `INSERT INTO \`${o.table}\` (`;
    const exports = Object.keys(o.exports);
    if (exports.length == 0) {
      throw new Error('no exports');
    }
    for (const [i, c] of exports.entries()) {
      q += `\`${c}\``;
      if (i < exports.length - 1) {
        q += `, `;
      }
    }
    q += `) VALUES (`;
    for (const [i, c] of exports.entries()) {
      q += `?`;
      v.push(o.exports[c]);
      if (i < exports.length - 1) {
        q += `, `;
      }
    }
    q += `)`;

    return [q, v];
  }

  #selectOf(o) {
    let q = ``;
    let v = [];

    q += `SELECT `;
    const imports = Object.keys(o.imports);
    if (imports.length == 0) {
      throw new Error('no imports');
    }
    if (!o.count) {
      for (const [i, c] of imports.entries()) {
        q += `\`${c}\``;
        if (i < imports.length - 1) {
          q += `, `;
        }
      }
    } else {
      let c = `COUNT(${o.imports[imports[0]]})`;
      o.countColumn = c;
      q += c;
    }

    q += ` FROM \`${o.table}\``;

    const where = this.#whereOf(o);
    q += where.q;
    v.push(...where.v);

    if (o?.order?.column) {
      q += ` ORDER BY \`${o.order.column}\``;
      if (!o?.order?.sort) {
        q += ` ${o.order.sort.toUpperCase()}`;
      }
    }

    if (o?.pages?.size) {
      q += ` LIMIT ?`;
      v.push(o.pages.size);
      if (o?.pages?.page) {
        q += ` OFFSET ?`;
        v.push(o.pages.size * o.pages.page);
      }
    }

    return [q, v];
  }

  #updateOf(o) {
    let q = ``;
    let v = [];

    q += `UPDATE \`${o.table}\` SET `;
    const exports = Object.keys(o.exports);
    for (const [i, c] of exports.entries()) {
      q += `\`${c}\` = ?`;
      v.push(o.exports[c]);
      if (i < exports.length - 1) {
        q += `, `;
      }
    }

    const where = this.#whereOf(o);
    q += where.q;
    v.push(...where.v);

    return [q, v];
  }

  #deleteOf(o) {
    let q = ``;
    let v = [];

    q += `DELETE FROM \`${o.table}\``;

    const where = this.#whereOf(o);
    q += where.q;
    v.push(...where.v);

    return [q, v];
  }

  #whereOf(o) {
    let q = ``;
    let v = [];

    const keys = Object.keys(o?.where?.columns || {});
    if (keys.length == 0) {
      return {
        q: q,
        v: v,
      };
    }
    q += ` WHERE (`;
    for (const [i, k] of keys.entries()) {
      if (o?.where?.like) {
        q += ` \`${k}\` LIKE ?`;
      } else {
        q += ` \`${k}\` = ?`;
      }
      v.push(o.where.columns[k]);
      if (i < keys.length - 1) {
        q += ` ` + (o?.where?.join ? o.where.join.toUpperCase() : `AND`);
      }
    }
    q += ` )`;

    return {
      q: q,
      v: v,
    };
  }

  async #importsParser(t, v) {
    if (t instanceof Function) {
      return await t(v);
    } else {
      switch (t) {
        case 'string': {
          return v + '';
        }
        case 'number': {
          return v * 1;
        }
        case 'boolean': {
          return !!v;
        }
        case 'array':
        case 'object':
        case 'json': {
          return JSON.parse(v);
        }
        case 'date': {
          return new Date(v);
        }
        default: {
          return v;
        }
      }
    }
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
