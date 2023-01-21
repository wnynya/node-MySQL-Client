const oex = {
  method: 'INSERT' || 'SELECT' || 'UPDATE' || 'DELETE',
  table: 'table',
  // o.imports => SELECT
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
  where: {
    columns: {
      col1: '%val1%',
      col2: 'val2',
      col4: 'bb',
    },
    join: 'AND' || 'OR',
    like: true,
  },
  // o.order => SELECT
  order: {
    column: 'col',
    sort: 'ASC' || 'DESC',
  },
  // o.pages => SELECT
  pages: {
    size: 50,
    page: 4,
  },
  // o.count => SELECT
  count: false,
};

const db = new MySQLClient();

(async () => {
  console.log(await db.query(oex));
  oex.method = 'SELECT';
  console.log(await db.query(oex));
  oex.method = 'UPDATE';
  console.log(await db.query(oex));
  oex.method = 'DELETE';
  console.log(await db.query(oex));
})();
