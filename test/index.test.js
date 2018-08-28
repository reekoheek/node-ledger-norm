const { Ledger } = require('node-ledger');
const Adapter = require('../index');
const { Manager } = require('node-norm');
const assert = require('assert');
const Memory = require('node-norm/adapters/memory');

describe.only('ledger', () => {
  it('populate', async () => {
    let manager = new Manager(testConfig());
    let adapter = new Adapter({ manager });
    let ledger = new Ledger({ adapter });
    await ledger.populate([
      { code: '100', name: 'Asset', currency: 'IDR' },
      {
        code: '200',
        name: 'Liabilities',
        children: [
          {
            code: '201',
            name: 'Customer savings IDR',
          },
        ],
      },
    ]);

    let account = await ledger.getAccount('100');
    assert.strictEqual(account.code, '100');
    assert.strictEqual(account.name, 'Asset');
    let children = await account.getChildren();
    assert.strictEqual(children.length, 0);

    account = await ledger.getAccount('200');
    assert.strictEqual(account.code, '200');
    assert.strictEqual(account.name, 'Liabilities');
    children = await account.getChildren();
    assert.strictEqual(children.length, 1);

    account = children.pop();
    assert.strictEqual(account.code, '201');
    assert.strictEqual(account.name, 'Customer savings IDR');
  });

  it('remove', async () => {
    let manager = new Manager(testConfig());
    let adapter = new Adapter({ manager });
    let ledger = new Ledger({ adapter });
    await ledger.populate([
      { code: '100', name: 'Asset', currency: 'IDR' },
      {
        code: '200',
        name: 'Liabilities',
        children: [
          {
            code: '201',
            name: 'Customer savings IDR',
          },
        ],
      },
    ]);

    let account = await ledger.getAccount('200');
    let [ child ] = await account.getChildren();
    await account.removeChild(child);

    await manager.runSession(async session => {
      let accounts = await session.factory('ledger_account').all();
      assert.strictEqual(accounts.length, 2);
    });
  });

  it('post transactions', async () => {
    let manager = new Manager(testConfig());
    let adapter = new Adapter({ manager });
    let ledger = new Ledger({ adapter });
    await ledger.populate([
      { code: '100', name: 'Asset', currency: 'IDR' },
      { code: '200', name: 'Liability', currency: 'IDR' },
      { code: '300', name: 'Equity', currency: 'IDR' },
    ]);

    await ledger.post({
      desc: 'Modal awal',
      entries: [
        { code: '100', db: 100 },
        { code: '300', cr: 100 },
      ],
    });

    await ledger.post({
      desc: 'Pinjaman',
      entries: [
        { code: '100', db: 50 },
        { code: '200', cr: 50 },
      ],
    });

    let account = await ledger.getAccount('100');
    let { db, cr } = await account.getBalance();
    assert.strictEqual(db, 150);
    assert.strictEqual(cr, 0);

    let entries = await account.getEntries();
    assert.strictEqual(entries.length, 2);

    entries = await ledger.getEntries();
    assert.strictEqual(entries.length, 4);
  });
});

function testConfig () {
  return {
    connections: [
      {
        adapter: Memory,
      },
    ],
  };
}
