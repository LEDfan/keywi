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
    this._nativeHostName = 'org.keepassxc.keepassxc_browser';
    this._currentKeePassXC = ''; // version
    this._associated = {'value': false, 'hash': null};
    this._keyRing = {};
    this._keyPair = {};
    this._nativePort = null;
    this._messageTimeout = 0;
    this._isConnected = false;
    this._clientID = null;
    this._keySize = 24;
    this._isKeePassXCAvailable = false;
    this._serverPublicKey = null;
    this._databaseHash = null;
    this._isDatabaseClosed = null;
  }

  async init() {
    try {
      try {
        if (this.secureStorage.ready()) {
          let data = await this.secureStorage.get('keyRing');
          this._keyRing = JSON.parse(data);
        } else {
          console.log("Can't init backend because SS is not ready!");
          return false;
        }
      } catch {
        this._keyRing = {};
      }

      this._connectToNative();
      this._generateNewKeyPair();
      await this._changePublicKeys();
      if (!await this._getDatabaseHash()) {
        console.log("Error during getDatabaseHash!");
        return false;
      }
      const associated = await this._testAssociation();

      if (associated && await this._isConfigured()) {
        // done
      } else {
        if (!await this.associate()) {
          console.log("Error during assocation!");
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
    const key = nacl.util.encodeBase64(this._keyPair.publicKey);
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
      clientID: this._clientID,
      triggerUnlock: 'true'
    };

    let response = await this._sendNativeMessage(request);
    if (response.message && response.nonce) {
      let parsed = this._decryptAdnVerify(response, incrementedNonce);
      console.log("associated response:", parsed);
      if (parsed) {
        const savedKey = this._compareVersion('2.3.4', this._currentKeePassXC) ? idKey : key;
        const id = parsed.id;
        this._setCryptoKey(id, savedKey); // Save the new identification public key as id key for the database
        this._associated.value = true;
        this._associated.hash = parsed.hash || 0;
        return true;
      }
      return false;
    } else if (response.error && response.errorCode) {
      return false;
    } else {
      return false;
    }
  }


  async reAssociate() {
    this._associated = {'value': false, 'hash': null};
    this.init()
  }

  async getLogins(url) {
    await this.ensureNativePortReady();
    let keys = [];
    const kpAction = 'get-logins';
    const nonce = this._getNonce();
    const incrementedNonce = this._incrementedNonce(nonce);
    const {dbid} = this._getCryptoKey();

    for (const keyHash of Object.keys(this._keyRing)) {
      keys.push({
        id: this._keyRing[keyHash].id,
        key: this._keyRing[keyHash].key
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
      clientID: this._clientID
    };

    let response = await this._sendNativeMessage(request);
    if (response.message && response.nonce) {
      const parsed = this._decryptAdnVerify(response, incrementedNonce);
      if (!parsed) {
        return {code: "unknown", credentials: []};
      }
      return {code: "ok", credentials: parsed.entries};
    } else if (response.error && response.errorCode) {
      console.log("error");
      if (response.error === "No logins found" || response.errorCode === 15) {
        return {code: "noLogins", credentials: []};
      }
      return false;
    } else {
      console.log("error unknown");
      return {code: "unknown", credentials: []};
    }
  }

  /**
   *
   * PRIVATE INTERFACE
   *
   */

  _isAssociated() {
    return (this._associated.value && this._associated.hash && this._associated.hash === this._databaseHash);
  }


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
    this._keyPair = nacl.box.keyPair();
    console.log("Generated new key pair: pub, priv", nacl.util.encodeBase64(this._keyPair.publicKey) + ' ' + nacl.util.encodeBase64(this._keyPair.secretKey));
  }


  _verifyResponse(response, nonce) {
    this._associated.value = response.success;
    if (response.success !== 'true') {
      this._associated.hash = null;
      return false;
    }

    this._associated.hash = this._databaseHash;

    if (!this._checkNonceLength(response.nonce)) {
      return false;
    }

    this._associated.value = (response.nonce === nonce);
    if (this._associated.value === false) {
      console.log('Error: Nonce compare failed');
      return false;
    }

    this._associated.hash = (this._associated.value) ? this._databaseHash : null;
    return this._isAssociated();
  }


  _setCryptoKey(id, key) {
    this._saveKey(this._databaseHash, id, key);
  }


  _saveKey(hash, id, key) {
    if (!(hash in this._keyRing)) {
      this._keyRing[hash] = {
        id: id,
        key: key,
        hash: hash,
        created: new Date().valueOf(),
        lastUsed: new Date().valueOf()
      };
    } else {
      this._keyRing[hash].id = id;
      this._keyRing[hash].key = key;
      this._keyRing[hash].hash = hash;
    }
    this.secureStorage.set('keyRing', JSON.stringify(this._keyRing));
  }

  _deleteKey(hash) {
    delete this._keyRing[hash];
    this.secureStorage.set('keyRing', JSON.stringify(this._keyRing));
  }

  async ensureNativePortReady() {
    if (this._nativePort === null) {
      await this.init();
      return true;
    }
    return true;
  }

  _sendNativeMessage(request, enableTimeout = false) {
    return new Promise((resolve, reject) => {
      let timeout;
      let action = request.action;
      let ev = this._nativePort.onMessage;

      let listener = ((port, action) => {
        let handler = (msg) => {
          if (msg && msg.action === action) {
            port.removeListener(handler);
            if (enableTimeout) {
              clearTimeout(timeout);
            }
            resolve(msg);
          }
        };
        return handler;
      })(ev, action);
      ev.addListener(listener);


      // Handle timeouts
      if (enableTimeout) {
        timeout = setTimeout(() => {
          this._isKeePassXCAvailable = false;
          ev.removeListener(listener.handler);
          reject('timeout');
        }, this._messageTimeout);
      }

      // Send the request
      if (this._nativePort) {
        this._nativePort.postMessage(request);
      } else {
        reject('NativePort not ready');
      }
    });
  }

  _connectToNative() {
    this._nativePort = browser.runtime.connectNative(this._nativeHostName);
    this._nativePort.onDisconnect.addListener((p) => {
      if (p.error) {
        console.log(`Disconnected due to an error: ${p.error.message}`);
      } else {
        console.log(p);
      }
      this._nativePort = null;
      this._isConnected = false;
      this._isDatabaseClosed = true;
      this._isKeePassXCAvailable = false;
      this._associated.value = false;
      this._associated.hash = null;
      this._databaseHash = '';
    });
    this._isConnected = true;
  }

  async _changePublicKeys(enableTimeout = false) {
    if (!this._isConnected) {
      // keepass.handleError(tab, kpErrors.TIMEOUT_OR_NOT_CONNECTED);
      // reject(false);
      return false;
    }

    const kpAction = 'change-public-keys';
    const key = nacl.util.encodeBase64(this._keyPair.publicKey);
    const nonce = this._getNonce();
    const incrementedNonce = this._incrementedNonce(nonce);
    this._clientID = nacl.util.encodeBase64(nacl.randomBytes(this._keySize));

    const request = {
      action: kpAction,
      publicKey: key,
      nonce: nonce,
      clientID: this._clientID
    };


    const response = await this._sendNativeMessage(request, enableTimeout);
    this._currentKeePassXC = response.version;

    if (!this._verifyKeyResponse(response, key, incrementedNonce)) {
      return false;
    } else {
      this._isKeePassXCAvailable = true;
      console.log('Server public key: ' + nacl.util.encodeBase64(this._serverPublicKey));
      return true;
    }
  }

  _verifyKeyResponse(response, key, nonce) {
    if (!response.success || !response.publicKey) {
      this._associated.hash = null;
      return false;
    }

    if (!this._checkNonceLength(response.nonce)) {
      console.log('Error: Invalid nonce length');
      return false;
    }

    let reply = (response.nonce === nonce);

    if (response.publicKey) {
      this._serverPublicKey = nacl.util.decodeBase64(response.publicKey);
      reply = true;
    }

    return reply;
  }

  _checkNonceLength(nonce) {
    return nacl.util.decodeBase64(nonce).length === nacl.secretbox.nonceLength;
  }

  _getNonce() {
    return nacl.util.encodeBase64(nacl.randomBytes(this._keySize));
  }


  _getCryptoKey() {
    let dbkey = null;
    let dbid = null;
    if (!(this._databaseHash in this._keyRing)) {
      return {dbid, dbkey};
    }

    dbid = this._keyRing[this._databaseHash].id;

    if (dbid) {
      dbkey = this._keyRing[this._databaseHash].key;
    }

    return {dbid, dbkey};
  }

  _encrypt(input, nonce) {
    const messageData = nacl.util.decodeUTF8(JSON.stringify(input));
    const messageNonce = nacl.util.decodeBase64(nonce);

    if (this._serverPublicKey) {
      const message = nacl.box(messageData, messageNonce, this._serverPublicKey, this._keyPair.secretKey);
      if (message) {
        return nacl.util.encodeBase64(message);
      }
    }
    return '';
  }

  _verifyDatabaseResponse(response, nonce) {
    if (response.success !== 'true') {
      this._associated.hash = null;
      return false;
    }

    if (!this._checkNonceLength(response.nonce)) {
      console.log('Error: Invalid nonce length');
      return false;
    }

    if (response.nonce !== nonce) {
      console.log('Error: Nonce compare failed');
      return false;
    }

    this._associated.hash = response.hash;
    return response.hash !== '' && response.success === 'true';
  }

  _decrypt(input, nonce) {
    const m = nacl.util.decodeBase64(input);
    const n = nacl.util.decodeBase64(nonce);
    return nacl.box.open(m, n, this._serverPublicKey, this._keyPair.secretKey);
  }

  _decryptAdnVerify(response, incrementedNonce) {
    const res = this._decrypt(response.message, response.nonce);
    if (!res) {
      return false;
    }

    const message = nacl.util.encodeUTF8(res);
    const parsed = JSON.parse(message);
    if (parsed.version) {
      this._currentKeePassXC = parsed.version;
    }

    if (!this._verifyResponse(parsed, incrementedNonce)) {
      const hash = response.hash || 0;
      this._deleteKey(hash);
      this._associated.value = false;
      this._associated.hash = null;

      return false;
    }

    return parsed;
  }

  async _getDatabaseHash() {
    if (!this._isConnected) {
      return false;
    }

    if (!this._serverPublicKey) {
      await this._changePublicKeys();
    }

    const kpAction = 'get-databasehash';
    const nonce = this._getNonce();
    const incrementedNonce = this._incrementedNonce(nonce);

    const messageData = {
      action: kpAction
    };

    const encrypted = this._encrypt(messageData, nonce);
    if (encrypted.length <= 0) {
      return this._databaseHash;
    }

    const request = {
      action: kpAction,
      message: encrypted,
      nonce: nonce,
      clientID: this._clientID
    };

    let response = await this._sendNativeMessage(request);
    if (response.message && response.nonce) {
      const res = this._decrypt(response.message, response.nonce);
      if (!res) {
        return false;
      }

      const message = nacl.util.encodeUTF8(res);
      const parsed = JSON.parse(message);

      // use  _verifyDatabaseResponse instead of verifyAndDecrypt
      if (this._verifyDatabaseResponse(parsed, incrementedNonce) && parsed.hash) {
        const oldDatabaseHash = this._databaseHash;
        if (parsed.version) {
          this._currentKeePassXC = parsed.version;
        }
        this._databaseHash = parsed.hash || '';

        if (oldDatabaseHash && oldDatabaseHash !== this._databaseHash) {
          this._associated.value = false;
          this._associated.hash = null;
        }

        this._isDatabaseClosed = false;
        this._isKeePassXCAvailable = true;
        return parsed.hash;
      } else if (parsed.errorCode) {
        this._databaseHash = '';
        this._isDatabaseClosed = true;
        return false;
      }
    } else {
      this._databaseHash = '';
      this._isDatabaseClosed = true;
      if (response.message && response.message === '') {
        this._isKeePassXCAvailable = false;
      }
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

  async _isConfigured() {
    if (this._databaseHash !== null) {
      const hash = await this._getDatabaseHash();
      if (!hash) {
        console.log("_getDatabaseHash failed");
        return false;
      }
      return hash in this._keyRing;
    } else {
      return this._databaseHash in this._keyRing;
    }
  }


  async _testAssociation(enableTimeout = false, triggerUnlock = false) {

    let dbHash = await this._getDatabaseHash();
    if (!dbHash) {
      console.log("_getDatabaseHash failed");
      return false;
    }

    if (this._isDatabaseClosed || !this._isKeePassXCAvailable) {
      return false;
    }

    if (this._isAssociated()) {
      return true;
    }

    if (!this._serverPublicKey) {
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
      clientID: this._clientID
    };

    const response = await this._sendNativeMessage(request, enableTimeout);

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
