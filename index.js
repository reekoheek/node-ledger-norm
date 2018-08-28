module.exports = class NormAdapter {
  constructor ({
    manager,
    accountCollection = 'ledger_account',
    entryCollection = 'ledger_entry',
  }) {
    this.manager = manager;
    this.accountCollection = accountCollection;
    this.entryCollection = entryCollection;
  }

  async _connect (account) {
    await this.manager.runSession(async session => {
      await session.factory(this.accountCollection)
        .insert(account)
        .save();
    });
  }

  async _disconnect ({ code }) {
    await this.manager.runSession(async session => {
      await session.factory(this.accountCollection, { code })
        .delete();
    });
  }

  async _get (code) {
    let account = await this.manager.runSession(session => {
      return session.factory(this.accountCollection, { code }).single();
    });

    return account;
  }

  async _findByParent (parent) {
    let accounts = await this.manager.runSession(session => {
      return session.factory(this.accountCollection, { parent }).all();
    });

    return accounts;
  }

  async _post ({ trace, posted, date, desc, entries }) {
    await this.manager.runSession(async session => {
      let query = session.factory(this.entryCollection);
      entries.forEach(({ code, db, cr }) => {
        query = query.insert({ trace, posted, date, code, db, cr });
      });
      await query.save();
    });
  }

  async _entries ({ code } = {}) {
    let entries = await this.manager.runSession(session => {
      if (code) {
        return session.factory(this.entryCollection, { code }).all();
      }

      return session.factory(this.entryCollection).all();
    });

    return entries;
  }

  async _balance (code) {
    let db = 0;
    let cr = 0;

    let entries = await this.manager.runSession(session => {
      return session.factory(this.entryCollection, { code }).all();
    });

    entries.forEach(entry => {
      db += entry.db || 0;
      cr += entry.cr || 0;
    });

    if (db < cr) {
      return { db: 0, cr: cr - db };
    } else {
      return { db: db - cr, cr: 0 };
    }
  }
};
