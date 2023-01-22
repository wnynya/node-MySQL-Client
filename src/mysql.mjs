import mysql from 'mysql2';

class MySQLClient {
  #pool;
  #importParsers = {};
  #columnTypes = {};

  constructor(options) {
    this.#pool = mysql.createPool({
      host: options.host ? options.host : 'localhost',
      port: options.port ? options.port : 3306,
      user: options.user,
      password: options.password,
      database: options.database,
      connectionLimit: options.limit ? options.limit : 200,
      connectTimeout: options.timeout ? options.timeout : 2000,
      multipleStatements: true,
    });
    this.#pool.on('error', (error) => {
      console.error(error);
    });

    this.setImportParser('string', (v) => {
      return v + '';
    });
    this.setImportParser('number', (v) => {
      return v * 1;
    });
    this.setImportParser('boolean', (v) => {
      return !!v;
    });
    this.setImportParser('array', (v) => {
      return JSON.parse(v);
    });
    this.setImportParser('object', (v) => {
      return JSON.parse(v);
    });
    this.setImportParser('json', (v) => {
      return JSON.parse(v);
    });
    this.setImportParser('date', (v) => {
      return new Date(v);
    });
  }

  async query(query, values) {
    if (typeof query == 'string') {
      console.log(query, values);
      if (values) {
        if (!(values instanceof Array)) {
          throw new Error('values must instanceof Array');
        }
        for (let i = 0; i < values.length; i++) {
          if (values[i] === undefined) {
            throw new Error('index ' + i + ' of values is undefined');
          } else if (values[i] instanceof Date) {
            values[i] = values[i]
              .toJSON()
              .replace(
                /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})\.\d{3}Z$/,
                '$1 $2'
              );
          } else if (values[i] instanceof Object) {
            try {
              values[i] = JSON.stringify(values[i]);
            } catch (error) {
              throw new Error(
                'index ' +
                  i +
                  ' of values is not serializable (' +
                  values[i].constructor.name +
                  ')'
              );
            }
          }
        }
      }
      const result = await this.#pool.promise().execute(query, values);
      return result[0];
    } else if (query instanceof Object) {
      const st = query?.statement?.toUpperCase();
      switch (st) {
        case 'INSERT': {
          return await this.query(...this.#insertSQL(query));
        }
        case 'SELECT': {
          let res = await this.query(...this.#selectSQL(query));
          if (!query.count) {
            const tasks = [];
            for (let i = 0; i < res.length; i++) {
              for (const k in res[i]) {
                tasks.push(
                  (async () => {
                    res[i][k] =
                      query.imports instanceof Array
                        ? await this.#parseImport(
                            this.#columnTypes?.[query.table]?.[k],
                            res[i][k]
                          )
                        : await this.#parseImport(query.imports[k], res[i][k]);
                  })()
                );
              }
            }
            await Promise.all(tasks);
          } else {
            res = res[0][query.countColumn];
          }
          return res;
        }
        case 'UPDATE': {
          return await this.query(...this.#updateSQL(query));
        }
        case 'DELETE': {
          return await this.query(...this.#deleteSQL(query));
        }
        default: {
          throw new Error('not support statement (' + st + ')');
        }
      }
    } else {
      throw new Error('unparsable query');
    }
  }

  #insertSQL(query) {
    let q = ``;
    let v = [];

    q += `INSERT INTO \`${this.#escape(query.table)}\` (`;
    const exports = Object.keys(query.exports);
    if (exports.length == 0) {
      throw new Error('no exports');
    }
    for (const [i, c] of exports.entries()) {
      q += `\`${this.#escape(c)}\``;
      if (i < exports.length - 1) {
        q += `, `;
      }
    }
    q += `) VALUES (`;
    for (const [i, c] of exports.entries()) {
      q += `?`;
      v.push(query.exports[c]);
      if (i < exports.length - 1) {
        q += `, `;
      }
    }
    q += `)`;

    return [q, v];
  }

  #selectSQL(query) {
    let q = ``;
    let v = [];

    q += `SELECT `;
    let imports = query.imports;
    if (!(query.imports instanceof Array)) {
      imports = Object.keys(query.imports);
    }

    if (imports.length == 0) {
      throw new Error('no imports');
    }
    if (!query.count) {
      for (const [i, c] of imports.entries()) {
        q += `\`${this.#escape(c)}\``;
        if (i < imports.length - 1) {
          q += `, `;
        }
      }
    } else {
      let c = `COUNT(${this.#escape(imports[0])})`;
      query.countColumn = c;
      q += c;
    }

    q += ` FROM \`${this.#escape(query.table)}\``;

    const where = this.#whereSQL(query);
    q += where.q;
    v.push(...where.v);

    if (query?.sort) {
      q += ` ORDER BY `;
      const sort = query.sort;
      if (typeof sort == 'string') {
        q += `\`${sort}\``;
      } else if (sort instanceof Array) {
        for (const [i, c] of sort.entries()) {
          q += `\`${this.#escape(c)}\``;
          if (i < sort.length - 1) {
            q += `, `;
          }
        }
      } else if (sort instanceof Object) {
        const sortCols = Object.keys(sort);
        for (const [i, c] of sortCols.entries()) {
          q += `\`${this.#escape(c)}\` ${sort[c] == `DESC` ? `DESC` : `ASC`}`;
          if (i < sortCols.length - 1) {
            q += `, `;
          }
        }
      }
    }

    if (query?.size) {
      q += ` LIMIT ?`;
      v.push(query.size * 1);
      if (query?.page) {
        q += ` OFFSET ?`;
        v.push(query.size * (query.page - 1));
      }
    }

    return [q, v];
  }

  #updateSQL(query) {
    let q = ``;
    let v = [];

    q += `UPDATE \`${this.#escape(query.table)}\` SET `;
    const exports = Object.keys(query.exports);
    for (const [i, c] of exports.entries()) {
      q += `\`${this.#escape(c)}\` = ?`;
      v.push(query.exports[c]);
      if (i < exports.length - 1) {
        q += `, `;
      }
    }

    const where = this.#whereSQL(query);
    q += where.q;
    v.push(...where.v);

    return [q, v];
  }

  #deleteSQL(query) {
    let q = ``;
    let v = [];

    q += `DELETE FROM \`${this.#escape(query.table)}\``;

    const where = this.#whereSQL(query);
    q += where.q;
    v.push(...where.v);

    return [q, v];
  }

  #whereSQL(query) {
    let q = ``;
    let v = [];

    let filter = query?.filter;
    if (!filter) {
      return { q: q, v: v };
    }

    if (typeof filter == 'string') {
      q += ` WHERE ( `;
      filter = filter.replace(
        /([a-zA-Z0-9\-\_]+) (=|==|:|::|<|>|<=|>=) ((?:['"`](?:\\['"`]|[^'"`])+['"`])|(?:\d+)|(?:true|false))/g,
        (m, m1, m2, m3) => {
          console.log({ m1, m2, m3 });
          m1 = `\`${this.#escape(m1)}\``;
          m2 = m2.replace(/==/g, '=');
          m2 = m2.replace(/:|::/g, 'LIKE');
          if (m3.match(/['"`](\\['"`]|[^'"`])+['"`]/)) {
            v.push(m3.replace(/['"`]((?:\\['"`]|[^'"`])+)['"`]/, '$1'));
          } else if (m3.match(/\d+/)) {
            v.push(m3 * 1);
          } else if (m3.match(/true|false/)) {
            v.push(!!m3);
          }
          return m1 + ' ' + m2 + ' ?';
        }
      );
      filter = filter.replace(/ && /g, 'AND');
      filter = filter.replace(/ \|\| /g, 'OR');
      q += filter;
      q += ` )`;
    } else if (filter instanceof Object) {
      const keys = Object.keys(query.filter || {});
      if (keys.length == 0) {
        return { q: q, v: v };
      }
      q += ` WHERE (`;
      for (const [i, k] of keys.entries()) {
        let value = query.filter[k];
        if (value instanceof Array) {
          q += ` (`;
          for (const [j, l] of value.entries()) {
            q += ` \`${this.#escape(k)}\` ${query?.like ? `LIKE` : `=`} ?`;
            v.push(l);
            if (j < value.length - 1) {
              q += ` OR`;
            }
          }
          q += ` )`;
        } else {
          q += ` \`${this.#escape(k)}\` ${query?.like ? `LIKE` : `=`} ?`;
          v.push(value);
        }
        if (i < keys.length - 1) {
          q += ` ` + (query?.join == `AND` ? `AND` : `OR`);
        }
      }
      q += ` )`;
    }

    return { q: q, v: v };
  }

  async #parseImport(parser, value) {
    if (value == null || value == undefined) {
      return null;
    } else if (parser instanceof Function) {
      return await parser(value);
    } else {
      return this.#importParsers[parser]
        ? await this.#importParsers[parser](value)
        : value;
    }
  }

  setImportParser(type, parser) {
    if (!typeof type == 'string') {
      throw new Error('type must be string');
    }
    if (!parser instanceof Function) {
      throw new Error('parser must instanceof Function');
    }
    this.#importParsers[type] = parser;
  }

  setColumnTypes(table, parsers) {
    this.#columnTypes[table] = parsers;
  }

  #escape(v) {
    return v.replace(/[^a-zA-Z0-9\-\_]/g, '');
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
