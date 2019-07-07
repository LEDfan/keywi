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
        let data  = await this.secureStorage.get('keyRing');
        this._keyRing = JSON.parse(data);
      } catch {
        this._keyRing = {};
      }

      this._connectToNative();
      this._generateNewKeyPair();
      await this._changePublicKeys();
      await this._getDatabaseHash();
      const associated = await this._testAssociation();

      if (associated && await this._isConfigured()) {
        // done
      } else {
        await this.associate();
      }
    } catch (e) {
      console.log(e);
    }
  }

  async associate() {
    const kpAction = 'associate';
    const key = nacl.util.encodeBase64(this._keyPair.publicKey);
    const nonce = this._getNonce();
    const incrementedNonce = this._incrementedNonce(nonce);
    const idKeyPair = nacl.box.keyPair();
    const idKey = nacl.util.encodeBase64(idKeyPair.publicKey);

    const messageData = {
      action: kpAction,
      key: key,
      idKey: idKey
    };

    const request = {
      action: kpAction,
      message: this._encrypt(messageData, nonce),
      nonce: nonce,
      clientID: this._clientID,
      triggerUnlock: 'true'
    };

    this._sendNativeMessage(request).then((response) => {
      if (response.message && response.nonce) {
        const res = this._decrypt(response.message, response.nonce);
        if (!res) {
          // keepass.handleError(tab, kpErrors.CANNOT_DECRYPT_MESSAGE);
          return;
        }

        const message = nacl.util.encodeUTF8(res);
        const parsed = JSON.parse(message);
        this._currentKeePassXC = parsed.version;
        const id = parsed.id;

        if (!this._verifyResponse(parsed, incrementedNonce)) {
          // eepass.handleError(tab, kpErrors.ASSOCIATION_FAILED);
        } else {
          // Use public key as identification key with older KeePassXC releases
          const savedKey = this._compareVersion('2.3.4', this._currentKeePassXC) ? idKey : key;
          this._setCryptoKey(id, savedKey); // Save the new identification public key as id key for the database
          this._associated.value = true;
          this._associated.hash = parsed.hash || 0;
        }

        // browserAction.show(callback, tab);
      } else if (response.error && response.errorCode) {
        // keepass.handleError(tab, response.errorCode, response.error);
      }
    });
  }


  async getLogins(url) {
    let entries = [];
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

    return this._sendNativeMessage(request).then((response) => {
      if (response.message && response.nonce) {
        const res = this._decrypt(response.message, response.nonce);
        if (!res) {
          // keepass.handleError(tab, kpErrors.CANNOT_DECRYPT_MESSAGE);
          return [];
        }

        const message = nacl.util.encodeUTF8(res);
        const parsed = JSON.parse(message);
        if (parsed.version) {
          this._currentKeePassXC = parsed.version;
        }

        if (this._verifyResponse(parsed, incrementedNonce)) {
          entries = parsed.entries;
          // keepass.updateLastUsed(keepass.databaseHash);
          // if (entries.length === 0) {
          //   // Questionmark-icon is not triggered, so we have to trigger for the normal symbol
          //   browserAction.showDefault(null, tab);
          // }
          // callback(entries);
          return entries;
        } else {
          console.log('RetrieveCredentials for ' + url + ' rejected');
        }
        // page.debug('keepass.retrieveCredentials() => entries.length = {1}', entries.length);
      } else if (response.error && response.errorCode) {
        console.log("error", response);
        // keepass.handleError(tab, response.errorCode, response.error);
        return [];
      } else {
        console.log("error unkown");
        // browserAction.showDefault(null, tab);
        return [];
      }
    });
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

  async _getDatabaseHash(enableTimeout = false, triggerUnlock = false) {
    if (!this._isConnected) {
      // Keepass.handleError(tab, kpErrors.TIMEOUT_OR_NOT_CONNECTED);
      // callback([]);
      return;
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
      // Keepass.handleError(tab, kpErrors.PUBLIC_KEY_NOT_FOUND);
      // callback(this._databaseHash);
      return this._databaseHash;
    }

    const request = {
      action: kpAction,
      message: encrypted,
      nonce: nonce,
      clientID: this._clientID
    };

    if (triggerUnlock === true) {
      request.triggerUnlock = 'true';
    }

    return this._sendNativeMessage(request, enableTimeout).then((response) => {
      if (response.message && response.nonce) {
        const res = this._decrypt(response.message, response.nonce);
        if (!res) {
          // Keepass.handleError(tab, kpErrors.CANNOT_DECRYPT_MESSAGE);
          return '';
        }

        const message = nacl.util.encodeUTF8(res);
        const parsed = JSON.parse(message);
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
          // Keepass.handleError(tab, kpErrors.DATABASE_NOT_OPENED);
          return this._databaseHash;
        }
      } else {
        this._databaseHash = '';
        this._isDatabaseClosed = true;
        if (response.message && response.message === '') {
          this._isKeePassXCAvailable = false;
          // keepass.handleError(tab, kpErrors.TIMEOUT_OR_NOT_CONNECTED);
        } else {
          // keepass.handleError(tab, response.errorCode, response.error);
        }
        return this._databaseHash;
      }
    });
  }

  _compareVersion(minimum, current, canBeEqual = true) {
    if (!minimum || !current) {
      return false;
    }

    const min = minimum.split('.', 3).map(s => s.padStart(4, '0')).join('.');
    const cur = current.split('.', 3).map(s => s.padStart(4, '0')).join('.');
    return (canBeEqual ? (min <= cur) : (min < cur));
  };

  async _isConfigured() {
    if (this._databaseHash !== null) {
      const hash = await this._getDatabaseHash();
      return hash in this._keyRing;
    } else {
      return this._databaseHash in this._keyRing;
    }
  };


  async _testAssociation(enableTimeout = false, triggerUnlock = false) {

    let dbHash = await this._getDatabaseHash();
    if (!dbHash) {
      return false;
    }

    if (this._isDatabaseClosed || !this._isKeePassXCAvailable) {
      return false;
    }

    if (this._isAssociated()) {
      return true;
    }

    if (!this._serverPublicKey) {
      // if (tab && page.tabs[tab.id]) {
      //   keepass.handleError(tab, kpErrors.PUBLIC_KEY_NOT_FOUND);
      // }
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
      const res = this._decrypt(response.message, response.nonce);
      if (!res) {
        return;
      }

      const message = nacl.util.encodeUTF8(res);
      const parsed = JSON.parse(message);
      if (parsed.version) {
        this._currentKeePassXC = parsed.version;
      }
      this._isEncryptionKeyUnrecognized = false;

      if (!this._verifyResponse(parsed, incrementedNonce)) {
        const hash = response.hash || 0;
        this._deleteKey(hash);
        this.isEncryptionKeyUnrecognized = true;
        // thi.handleError(tab, kpErrors.ENCRYPTION_KEY_UNRECOGNIZED);
        this._associated.value = false;
        this._associated.hash = null;
      } else if (!this._isAssociated()) {
        // keepass.handleError(tab, kpErrors.ASSOCIATION_FAILED);
      }
    } else if (response.error && response.errorCode) {
      // keepass.handleError(tab, response.errorCode, response.error);
    }
    return this._isAssociated();
  }

}
