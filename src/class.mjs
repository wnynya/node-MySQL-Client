class MySQLClass {
  constructor(mysql) {
    this.mysql = mysql;
  }

  async insertQuery(parts = '*') {
    const exports = this.#getSchemaPartsExports(parts);
    if (Object.keys(exports).length == 0) {
      return;
    }
    await this.mysql.query({
      statement: 'INSERT',
      table: this.table,
      exports: exports,
    });
  }

  async selectQuery(parts = '*') {
    const imports = this.#getSchemaPartsImports(parts);
    if (Object.keys(imports).length == 0) {
      return;
    }
    const data = await this.mysql.query({
      statement: 'SELECT',
      table: this.table,
      imports: imports,
      filter: this.filter,
      single: true,
    });

    if (!data) {
      throw new Error('default404');
    }

    for (const key in data) {
      this[key] = data[key];
    }
  }

  async updateQuery(parts = []) {
    const exports = this.#getSchemaPartsExports(parts);
    if (Object.keys(exports).length == 0) {
      return;
    }
    await this.mysql.query({
      statement: 'UPDATE',
      table: this.table,
      exports: exports,
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
        if (this.schema[part] instanceof Array) {
          imports[part] = this.schema[part][0];
        } else {
          imports[part] = this.schema[part];
        }
      }
    } else if (parts instanceof Array) {
      for (const part of parts) {
        if (!this.schema.hasOwnProperty(part)) {
          continue;
        }
        if (this.schema[part] instanceof Array) {
          imports[part] = this.schema[part][0];
        } else {
          imports[part] = this.schema[part];
        }
      }
    }

    return imports;
  }

  #getSchemaPartsExports(parts) {
    const exports = {};

    if (parts == '*') {
      for (const part in this.schema) {
        if (this.schema[part] instanceof Array) {
          exports[part] = this.schema[part][1](this[part]);
        } else {
          exports[part] = this[part];
        }
      }
    } else if (parts instanceof Array) {
      for (const part of parts) {
        if (!this.schema.hasOwnProperty(part)) {
          continue;
        }
        if (this.schema[part] instanceof Array) {
          exports[part] = this.schema[part][1](this[part]);
        } else {
          exports[part] = this[part];
        }
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
          try {
            value = JSON.parse(JSON.stringify(value));
          } catch (error) {}
        } else {
          value = value + '';
        }
      }
      json[part] = value;
    }
    return json;
  }
}

export { MySQLClass };
export default MySQLClass;
