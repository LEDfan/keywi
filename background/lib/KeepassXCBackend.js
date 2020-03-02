/**
 * @copyright (C) 2019 Tobia De Koninck
 *
 * This file is part of Keywi.
 * Keywi is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Keywi is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Keywi.  If not, see <http://www.gnu.org/licenses/>.
 *
 *
 * Note: parts of this file are directly based on code of the keepassxreboot/keepassxc-browser project.
 * (Especially the following file: https://github.com/keepassxreboot/keepassxc-browser/blob/develop/keepassxc-browser/background/keepass.js)
 * That project is licensed under the GPL-3.0 (like Keywi).
 * We want to thank the developers and contributors of the above project.
 *
 */

class KeepassXCBackend extends PasswordBackend {

  /**
   *
   * PUBLIC INTERFACE
   *
   */
  constructor(secureStorage) {
    super('KeepassLegacy', secureStorage);
    this._state = new State();
    Object.freeze(this._state);
  }


  async init() {
    try {
      try {
        if (this.secureStorage.ready()) {
          let data = await this.secureStorage.get('keyRing');
          this._state = this._state.setKeyRing(JSON.parse(data));
        } else {
          console.log("Can't init backend because SS is not ready!");
          return false;
        }
      } catch {
        this._state = this._state.resetKeyRing();
      }

      this._connectToNative(); // connect

      this._generateNewKeyPair();
      await this._changePublicKeys();
      if (!await this._getDatabaseHash()) {
        console.log("Error during getDatabaseHash!");
        return false;
      }
      const associated = await this._testAssociation();

      if (associated && await this._state.hasHashInKeyRing(this._state.getDatabaseHash())) {
        console.log("Init done")
        // done
      } else {
        if (!await this.associate()) {
          console.log("Error during association!");
          return false;
        }
      }
    } catch (e) {
      console.log(e);
      return false;
    }
    return true;
  }

  async associate() {
    const key = nacl.util.encodeBase64(this._state._keyPair.publicKey);
    const nonce = this._getNonce();
    const incrementedNonce = this._incrementedNonce(nonce);
    const idKeyPair = nacl.box.keyPair();
    const idKey = nacl.util.encodeBase64(idKeyPair.publicKey);

    const messageData = {
      action: 'associate',
      key: key,
      idKey: idKey
    };

    const request = {
      action: 'associate',
      message: this._encrypt(messageData, nonce),
      nonce: nonce,
      clientID: this._state.getClientID(),
      triggerUnlock: 'true'
    };

    let response = await this._sendNativeMessage(request, true);
    if (response.message && response.nonce) {
      let parsed = this._decryptAdnVerify(response, incrementedNonce);
      console.log("associated response:", parsed);
      if (parsed) {
        const savedKey = this._compareVersion('2.3.4', this._state.getCurrentKeepassXCVersion()) ? idKey : key;
        const id = parsed.id;
        this._setCryptoKey(id, savedKey); // Save the new identification public key as id key for the database
        this._state = this._state.setAssociated(parsed.hash || 0);
        return true;
      }
      this._state = this._state.disAssociated();
      return false;
    } else if (response.error && response.errorCode) {
      this._state = this._state.disAssociated();
      return false;
    } else {
      this._state = this._state.disAssociated();
      return false;
    }
  }


  async reAssociate() {
    this._state = new State();
    Object.freeze(this._state);
    await this.init()
  }

  async getLogins(url) {
    if (!this._state.isConnectedToNativePort() || !this._state.isAssociatedWithCorrectDatabase()) {
      if (!await this.init()) {
        return {code: "unknown", credentials: []};
      }
    }

    let keys = [];
    const kpAction = 'get-logins';
    const nonce = this._getNonce();
    const incrementedNonce = this._incrementedNonce(nonce);
    const {dbid} = this._getCryptoKey();

    let keyRing = this._state.getKeyRing();
    for (const keyHash of Object.keys(this._state.getKeyRing())) {
      keys.push({
        id: keyRing[keyHash].id,
        key: keyRing[keyHash].key
      });
    }

    const messageData = {
      action: kpAction,
      id: dbid,
      url: url,
      keys: keys
    };

    const request = {
      action: kpAction,
      message: this._encrypt(messageData, nonce),
      nonce: nonce,
      clientID: this._state.getClientID()
    };

    let response = await this._sendNativeMessage(request);
    if (response.message && response.nonce) {
      const parsed = this._decryptAdnVerify(response, incrementedNonce);
      if (!parsed) {
        return {code: "unknown", credentials: []};
      }
      return {code: "ok", credentials: parsed.entries};
    } else if (response.error && response.errorCode) {
      if (response.error === "Database not opened" || response.errorCode === 1) {
        return {code: "unknown", credentials: []};
      }
      if (response.error === "No logins found" || response.errorCode === 15) {
        return {code: "noLogins", credentials: []};
      }
      return {code: "unknown", credentials: []};
    } else {
      return {code: "unknown", credentials: []};
    }
  }

  /**
   *
   * PRIVATE INTERFACE
   *
   */

  _incrementedNonce(nonce) {
    const oldNonce = nacl.util.decodeBase64(nonce);
    let newNonce = oldNonce.slice(0);

    // from libsodium/utils.c
    let i = 0;
    let c = 1;
    for (; i < newNonce.length; ++i) {
      c += newNonce[i];
      newNonce[i] = c;
      c >>= 8;
    }

    return nacl.util.encodeBase64(newNonce);
  }


  _generateNewKeyPair() {
    this._state = this._state.newKeyPair(nacl.box.keyPair());
    console.log("Generated new key pair: pub, priv", nacl.util.encodeBase64(this._state._keyPair.publicKey) + ' ' + nacl.util.encodeBase64(this._state._keyPair.secretKey));
  }


  _verifyResponse(response, nonce) {
    if (response.success !== 'true') {
      this._state = this._state.disAssociated();
      return false;
    }

    if (!this._checkNonceLength(response.nonce)) {
      this._state = this._state.disAssociated();
      return false;
    }

    if (response.nonce !== nonce) {
      this._state = this._state.disAssociated();
      return false;
    }

    this._state = this._state.setAssociatedHash(this._state.getDatabaseHash());
    return this._state.isAssociatedWithCorrectDatabase();
  }


  _setCryptoKey(id, key) {
    this._saveKey(this._state._databaseHash, id, key);
  }

  _saveKey(hash, id, key) {
    this._state = this._state.saveKeyInKeyring(hash, id, key);
    this.secureStorage.set('keyRing', JSON.stringify(this._state.getKeyRing()));
  }

  _deleteKey(hash) {
    this._state.deleteKeyFromKeyRing(hash);
    this.secureStorage.set('keyRing', JSON.stringify(this._state.getKeyRing()));
  }

  _sendNativeMessage(request, bigTimeout = false) {
    return new Promise((resolve, reject) => {
      let timeout;
      let action = request.action;
      let ev = this._state._nativePort.onMessage;

      let listener = ((port, action) => {
        let handler = (msg) => {
          if (msg && msg.action === action) {
            port.removeListener(handler);
            clearTimeout(timeout);
            resolve(msg);
          }
        };
        return handler;
      })(ev, action);
      ev.addListener(listener);

      let timeoutDuration = 125;
      if (bigTimeout) {
        // when associating, a bigger timeout is required
        timeoutDuration = 10000;
      }

      // Handle timeouts
      timeout = setTimeout(() => {
        ev.removeListener(listener.handler);
        this._state = new State();
        console.log("Disconnected by timeout");
        Object.freeze(this._state);
        reject('timeout');
      }, timeoutDuration);

      // Send the request
      if (this._state._nativePort) {
        this._state._nativePort.postMessage(request);
      } else {
        reject('NativePort not ready');
      }
    });
  }

  _connectToNative() {
    this._state = this._state.connectToNativePort((p) => {
      if (p.error) {
        console.log(`Disconnected due to an error: ${p.error.message}`);
      } else {
        console.log(p);
      }
      this._state = new State();
      console.log("Disconnected");
      Object.freeze(this._state);
    });
  }

  async _changePublicKeys() {
    if (!this._state.isConnectedToNativePort()) {
      return false;
    }

    const kpAction = 'change-public-keys';
    const key = nacl.util.encodeBase64(this._state._keyPair.publicKey);
    const nonce = this._getNonce();
    const incrementedNonce = this._incrementedNonce(nonce);
    this._state = this._state.setClientID(nacl.util.encodeBase64(nacl.randomBytes(this._state._keySize)));

    const request = {
      action: kpAction,
      publicKey: key,
      nonce: nonce,
      clientID: this._state.getClientID()
    };

    const response = await this._sendNativeMessage(request);

    if (!this._verifyKeyResponse(response, key, incrementedNonce)) {
      return false;
    } else {
      console.log('Server public key: ' + nacl.util.encodeBase64(this._state._serverPublicKey));
      return true;
    }
  }

  _verifyKeyResponse(response, key, nonce) {
    if (!response.success || !response.publicKey) {
      this._state = this._state.disAssociated();
      return false;
    }

    if (!this._checkNonceLength(response.nonce)) {
      this._state = this._state.disAssociated();
      return false;
    }

    let reply = (response.nonce === nonce);

    if (response.publicKey) {
      this._state = this._state.setServerPublicKey(nacl.util.decodeBase64(response.publicKey));
      reply = true;
    }

    return reply;
  }

  _checkNonceLength(nonce) {
    return nacl.util.decodeBase64(nonce).length === nacl.secretbox.nonceLength;
  }

  _getNonce() {
    return nacl.util.encodeBase64(nacl.randomBytes(this._state._keySize));
  }

  _getCryptoKey() {
    return this._state.getKeyFromKeyRing(this._state.getDatabaseHash());
  }

  _encrypt(input, nonce) {
    const messageData = nacl.util.decodeUTF8(JSON.stringify(input));
    const messageNonce = nacl.util.decodeBase64(nonce);

    // if (this._state.hasServerPublicKey()) {

    // }
    if (this._state.hasServerPublicKey()) {
      const message = nacl.box(messageData, messageNonce,
        this._state.getServerPublicKey(),
        this._state._keyPair.secretKey);
      if (message) {
        return nacl.util.encodeBase64(message);
      }
    }
    console.trace();
    throw new Error("Encryption not working!")
  }

  _verifyDatabaseResponse(response, nonce) {
    if (response.success !== 'true') {
      this._state = this._state.resetDatabaseHash();
      return false;
    }

    if (!this._checkNonceLength(response.nonce)) {
      this._state = this._state.disAssociated();
      return false;
    }

    if (response.nonce !== nonce) {
      this._state = this._state.disAssociated();
      return false;
    }

    this._state = this._state.setAssociatedHash(response.hash);
    return response.hash !== '' && response.success === 'true';
  }

  _decrypt(input, nonce) {
    const m = nacl.util.decodeBase64(input);
    const n = nacl.util.decodeBase64(nonce);
    return nacl.box.open(m, n, this._state._serverPublicKey, this._state._keyPair.secretKey);
  }

  _decryptAdnVerify(response, incrementedNonce) {
    const res = this._decrypt(response.message, response.nonce);
    if (!res) {
      return false;
    }

    const message = nacl.util.encodeUTF8(res);
    const parsed = JSON.parse(message);
    if (parsed.version) {
      this._state = this._state.setKeepassXCVersion(parsed.version);
    }

    if (!this._verifyResponse(parsed, incrementedNonce)) {
      const hash = response.hash || 0;
      this._deleteKey(hash);
      this._state = this._state.disAssociated();
      return false;
    }

    return parsed;
  }

  async _getDatabaseHash() {
    if (!this._state.isConnectedToNativePort()) {
      return false;
    }

    if (!this._state.hasServerPublicKey()) {
      await this._changePublicKeys();
    }

    const kpAction = 'get-databasehash';
    const nonce = this._getNonce();
    const incrementedNonce = this._incrementedNonce(nonce);

    const messageData = {
      action: kpAction
    };

    const encrypted = this._encrypt(messageData, nonce);

    const request = {
      action: kpAction,
      message: encrypted,
      nonce: nonce,
      clientID: this._state.getClientID()
    };

    let response = await this._sendNativeMessage(request);
    if (response.message && response.nonce) {
      const res = this._decrypt(response.message, response.nonce);
      if (!res) {
        this._state = this._state.disAssociated();
        return false;
      }

      const message = nacl.util.encodeUTF8(res);
      const parsed = JSON.parse(message);

      if (this._verifyDatabaseResponse(parsed, incrementedNonce) && parsed.hash) {
        const oldDatabaseHash = this._state.getDatabaseHash();
        if (parsed.version) {
          this._state = this._state.setKeepassXCVersion(parsed.version);
        }
        this._state = this._state.newDatabaseHash(parsed.hash || '');

        if (oldDatabaseHash && oldDatabaseHash !== this._state.getDatabaseHash()) {
          this._state = this._state.disAssociated();
        }

        return parsed.hash;
      } else if (parsed.errorCode) {
        this._state = this._state.resetDatabaseHash();
        return false;
      }
    } else {
      this._state = this._state.resetDatabaseHash();
      return false;
    }
  }


  _compareVersion(minimum, current, canBeEqual = true) {
    if (!minimum || !current) {
      return false;
    }

    const min = minimum.split('.', 3).map(s => s.padStart(4, '0')).join('.');
    const cur = current.split('.', 3).map(s => s.padStart(4, '0')).join('.');
    return (canBeEqual ? (min <= cur) : (min < cur));
  }

  /**
   * Must happen before trying to do getLogins()
   * @param triggerUnlock
   * @returns {Promise<boolean>}
   * @private
   */
  async _testAssociation(triggerUnlock = false) {

    let dbHash = await this._getDatabaseHash();
    if (!dbHash) {
      return false;
    }

    if (!this._state.isAssociatedWithCorrectDatabase()) {
      return false;
    }

    if (!this._state.hasServerPublicKey()) {
      return false;
    }

    const kpAction = 'test-associate';
    const nonce = this._getNonce();
    const incrementedNonce = this._incrementedNonce(nonce);
    const {dbid, dbkey} = this._getCryptoKey();

    if (dbkey === null || dbid === null) {
      return false;
    }

    const messageData = {
      action: kpAction,
      id: dbid,
      key: dbkey
    };

    const request = {
      action: kpAction,
      message: this._encrypt(messageData, nonce),
      nonce: nonce,
      clientID: this._state.getClientID()
    };

    const response = await this._sendNativeMessage(request);

    if (response.message && response.nonce) {
      const res = this._decryptAdnVerify(response, incrementedNonce);
      return !!res;
    } else if (response.error && response.errorCode) {
      return false;
    } else {
      return false;
    }
  }

}
