import MySQLClient from '../src/index.mjs';
import { SQLGen, MySQLClass } from '../src/index.mjs';

const mysql = MySQLClient;

const client = new MySQLClient({
  host: '10.0.0.105',
  user: 'tester',
  password: '123456',
  database: 'test',
});
client.setColumnTypes('example', {
  meta: 'json',
});

mysql.set(client);

class Example extends MySQLClass {
  constructor(uid) {
    super(mysql);

    this.uid = uid;
    this.eid = '';
    this.name = '';
    this.creation = new Date();
    this.meta = {};

    this.table = 'example';
    this.schema = {
      uid: 'string',
      eid: 'string',
      name: 'string',
      creation: 'date',
      meta: (v) => {
        return new Promise((resolve) => {
          v = JSON.parse(v);
          v.addon = 'message';
          setTimeout(() => {
            resolve(v);
          }, 100);
        });
      },
    };
    this.filter = { uid: this.uid };
  }
}

const oex = {
  statement: 'INSERT' || 'SELECT' || 'UPDATE' || 'DELETE',
  table: 'table',
  // o.imports => SELECT
  // when pre-typed
  imports: ['a', 'b', 'c'],
  // column name: 'type' || parser()
  imports: {
    a: 'string',
    b: 'number',
    c: 'boolean',
    d: 'object',
    e: 'array',
    f: 'date',
    g: async (val) => {
      return val;
    },
  },
  // o.exports => INSERT, UPDATE
  // column name: value
  exports: {
    a: 'string',
    b: 1234,
    c: new Date(),
    d: { key: 'val' },
    e: [1, 'a', false],
    f: true,
  },
  // o.where => SELECT, UPDATE, DELETE
  filter: `val == 'a' && b :: '%c%' || ( d > 0 && c < 40 )`,
  // o.where => SELECT, UPDATE, DELETE
  filter: {
    col1: '%val1%',
    col2: 'val2',
    col4: ['bb', 'dd'],
  },
  // o.like => SELECT, UPDATE, DELETE (for filter)
  like: true,
  // o.join => SELECT, UPDATE, DELETE (for filter)
  join: 'a',
  // o.sort => SELECT
  sort: 'creation',
  sort: ['creation', 'uid'],
  sort: {
    creation: 'ASC',
    uid: 'DESC',
  },
  // o.size => SELECT
  size: 100,
  // o.page => SELECT
  page: 1,
  // o.count => SELECT
  count: false,
};

async function test() {
  var t = new Date().getTime();
  console.log(
    await db.query({
      statement: 'SELECT',
      table: 'example',
      imports: {
        uid: 'string',
        eid: 'string',
        name: '',
        creation: 'date',
        //meta: 'json',
        meta: (v) => {
          return new Promise((resolve) => {
            v = JSON.parse(v);
            v.addon = 'message';
            setTimeout(() => {
              resolve(v);
            }, 100);
          });
        },
      },
      exports: {
        //uid: 'uid-' + new Date().getTime(),
        eid: 'uid-' + new Date().getTime(),
        /*name: 'user3',
        email: 'user3@test.com',
        hash: 'sans',
        creation: new Date(),
        meta: {
          object: 'yes',
          bool: false,
          num: 2.0783,
        },*/
      },
      pages: {
        size: 100,
        page: 1,
      },
      order: {
        column: 'creation',
      },
      where: {
        columns: {
          name: '%user%',
        },
        like: true,
      },
    })
  );
  console.log('task end ' + (new Date().getTime() - t) + 'ms');
}

async function test2() {
  var t = new Date().getTime();
  console.log(
    await mysql.query({
      statement: 'SELECT',
      table: 'example`',
      imports: ['uid`', 'eid', 'creation', 'meta'],
      filter: 'uid = "uid-1674352583878"',
      filter: {
        'uid`': ['uid-1674352583878', 'uid-1674352667786'],
        eid: '%u%`',
      },
      like: true,
      join: 'a`',
      size: '100',
      page: 1,
      sort: {
        '`creation': 'ASC`',
        uid: 'DESC`',
      },
    })
  );
  console.log('task end ' + (new Date().getTime() - t) + 'ms');
}

function test3() {
  console.log(
    SQLGen(
      {
        statement: 'INSERT',
        table: 'example',
        exports: {
          uid: 'ppap',
          hash: 1,
          name: true,
          email: 'hello',
          creation: new Date(),
          meta: {},
        },
      },
      true
    )
  );
}

async function test4() {
  const e1 = new Example('uid-1674352583878');
  const e2 = new Example('uid-1674352667786');

  await e2.selectQuery('*');

  console.log(e2.toSchemaObject());
  console.log(e2.toSchemaJSON());
}

test4();
/*

api/table

POST => INSERT
GET => SELECT
PATCH => UPDATE
DELETE => DELETE

body 

GET api/table 

query {
  filter: "",
}

 */
