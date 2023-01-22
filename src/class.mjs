export default class MySQLClass {
  constructor(mysql) {
    this.mysql = mysql;
  }

  async insertQuery(parts = '*') {
    await this.mysql.query({
      statement: 'INSERT',
      table: this.table,
      exports: this.#getSchemaPartsExports(parts),
    });
  }

  async selectQuery(parts = '*') {
    const data = await this.mysql.query({
      statement: 'SELECT',
      table: this.table,
      imports: this.#getSchemaPartsImports(parts),
      filter: this.filter,
      single: true,
    });

    for (const key in data) {
      this[key] = data[key];
    }
  }

  async updateQuery(parts = []) {
    await this.mysql.query({
      statement: 'UPDATE',
      table: this.table,
      exports: this.#getSchemaPartsExports(parts),
      filter: this.filter,
    });
  }

  async deleteQuery() {
    await this.mysql.query({
      statement: 'DELETE',
      table: this.table,
      filter: this.filter,
    });
  }

  #getSchemaPartsImports(parts) {
    const imports = {};

    if (parts == '*') {
      for (const part in this.schema) {
        imports[part] = this.schema[part];
      }
    } else if (parts instanceof Array) {
      for (const part of parts) {
        if (!this.schema.hasOwnProperty(part)) {
          continue;
        }
        imports[part] = this.schema[part];
      }
    }

    return imports;
  }

  #getSchemaPartsExports(parts) {
    const exports = {};

    if (parts == '*') {
      for (const part in this.schema) {
        exports[part] = this[part];
      }
    } else if (parts instanceof Array) {
      for (const part of parts) {
        if (!this.schema.hasOwnProperty(part)) {
          continue;
        }
        exports[part] = this[part];
      }
    }

    return exports;
  }

  toSchemaObject() {
    const object = {};
    for (const part in this.schema) {
      object[part] = this[part];
    }
    return object;
  }

  toSchemaJSON() {
    const json = {};
    for (const part in this.schema) {
      let value = this[part];
      if (!['string', 'number', 'boolean'].includes(typeof value)) {
        if (value instanceof Date) {
          value = value.getTime();
        } else if (value instanceof Object) {
          value = JSON.parse(JSON.stringify(value));
        } else {
          value = value + '';
        }
      }
      json[part] = value;
    }
    return json;
  }
}
