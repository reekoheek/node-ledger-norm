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

  _connect (account, { session } = {}) {
    let fn = async session => {
      await session.factory(this.accountCollection)
        .insert(account)
        .save();
    };

    if (session) {
      return fn(session);
    }

    return this.manager.runSession(fn);
  }

  _disconnect ({ code }, { session } = {}) {
    let fn = async session => {
      await session.factory(this.accountCollection, { code })
        .delete();
    };

    if (session) {
      return fn(session);
    }

    return this.manager.runSession(fn);
  }

  _get (code, { session } = {}) {
    let fn = session => {
      return session.factory(this.accountCollection, { code }).single();
    };

    if (session) {
      return fn(session);
    }

    return this.manager.runSession(fn);
  }

  _findByParent (parent, { session } = {}) {
    let fn = session => {
      return session.factory(this.accountCollection, { parent }).all();
    };

    if (session) {
      return fn(session);
    }

    return this.manager.runSession(fn);
  }

  _post ({ trace, posted, date, desc, entries }, { session } = {}) {
    let fn = async session => {
      let query = session.factory(this.entryCollection);
      entries.forEach(({ code, db, cr, param1, param2, param3 }) => {
        query = query.insert({ trace, posted, date, code, desc, db, cr, param1, param2, param3 });
      });
      await query.save();
    };

    if (session) {
      return fn(session);
    }

    return this.manager.runSession(fn);
  }

  _entries ({ code } = {}, { session } = {}) {
    let fn = session => {
      if (code) {
        return session.factory(this.entryCollection, { code }).all();
      }

      return session.factory(this.entryCollection).all();
    };

    if (session) {
      return fn(session);
    }

    return this.manager.runSession(fn);
  }

  async _balance (code, { session } = {}) {
    let db = 0;
    let cr = 0;

    let sessionSpecified = Boolean(session);
    if (!sessionSpecified) {
      session = this.manager.openSession();
    }

    try {
      let entries = await session.factory(this.entryCollection, { code }).all();

      entries.forEach(entry => {
        db += entry.db || 0;
        cr += entry.cr || 0;
      });

      if (!sessionSpecified) {
        await session.close();
        await session.dispose();
      }

      if (db < cr) {
        return { db: 0, cr: cr - db };
      } else {
        return { db: db - cr, cr: 0 };
      }
    } catch (err) {
      if (!sessionSpecified) {
        await session.dispose();
      }
      throw err;
    }
  }
};
