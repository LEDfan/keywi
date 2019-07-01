class KeepassLegacyBackend extends PasswordBackend {


  constructor(secureStorage) {
    super('KeepassLegacy', secureStorage);
    this._currentKeePassXC = ''; // version
    this.associated = {'value': false, 'hash': null};
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
  }

  async init() {
    await this._migrateKeyRing();
    this._connectToNative();
    this._generateNewKeyPair();
    await this._changePublicKeys();
    await this._getDatabaseHash();
    await this.associate();
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
          // const savedKey = Keepass.compareVersion('2.3.4', Keepass.currentKeePassXC) ? idKey : key;
          this._setCryptoKey(id, key); // Save the new identification public key as id key for the database
          this.associated.value = true;
          this.associated.hash = parsed.hash || 0;
        }

        // browserAction.show(callback, tab);
      } else if (response.error && response.errorCode) {
        // keepass.handleError(tab, response.errorCode, response.error);
      }
    });
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
  ;

  _verifyResponse(response, nonce) {
    this.associated.value = response.success;
    if (response.success !== 'true') {
      this.associated.hash = null;
      return false;
    }

    this.associated.hash = this._databaseHash;

    if (!this._checkNonceLength(response.nonce)) {
      return false;
    }

    this.associated.value = (response.nonce === nonce);
    if (this.associated.value === false) {
      console.log('Error: Nonce compare failed');
      return false;
    }

    // if (id) { // TODO
    //   this.associated.value = (this.associated.value && id === response.id);
    // }

    this.associated.hash = (this.associated.value) ? this._databaseHash : null;
// return keepass.isAssociated();
    return (this.associated.value && this.associated.hash && this.associated.hash === this._databaseHash);
  }
  ;

  _setCryptoKey(id, key) {
    this._saveKey(this._databaseHash, id, key);
  }
  ;

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
    // browser.storage.local.set({'keyRing': keepass.keyRing});
  }
  ;


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
      // if (enableTimeout) {
      //   timeout = setTimeout(() => {
      //     const errorMessage = {
      //       action: action,
      //       error: kpErrors.getError(kpErrors.TIMEOUT_OR_NOT_CONNECTED),
      //       errorCode: kpErrors.TIMEOUT_OR_NOT_CONNECTED
      //     };
      //     Keepass.isKeePassXCAvailable = false;
      //     ev.removeListener(listener.handler);
      //     resolve(errorMessage);
      //   }, this._messageTimeout);
      // }

      // Send the request
      if (this._nativePort) {
        this._nativePort.postMessage(request);
      }
    });
  }

  _migrateKeyRing() {
    return new Promise((resolve, reject) => {
      browser.storage.local.get('keyRing').then((item) => {
        const keyring = item.keyRing;
        // Change dates to numbers, for compatibilty with Chromium based browsers
        if (keyring) {
          let num = 0;
          for (let keyHash in keyring) {
            let key = keyring[keyHash];
            ['created', 'lastUsed'].forEach((fld) => {
              let v = key[fld];
              if (v instanceof Date && v.valueOf() >= 0) {
                key[fld] = v.valueOf();
                num++;
              } else if (typeof v !== 'number') {
                key[fld] = Date.now().valueOf();
                num++;
              }
            });
          }
          if (num > 0) {
            browser.storage.local.set({keyRing: keyring});
          }
        }
        resolve();
      });
    });
  };

  _connectToNative() {
    this._nativePort = browser.runtime.connectNative(Keepass.nativeHostName);
    this._nativePort.onDisconnect.addListener((p) => {
      if (p.error) {
        console.log(`Disconnected due to an error: ${p.error.message}`);
      } else {
        console.log(p);
      }
      this._isConnected = false;
    });
    // keepass.nativePort.onMessage.addListener(keepass.onNativeMessage);
    // keepass.nativePort.onDisconnect.addListener(onDisconnected);
    this._isConnected = true;
  };

  _changePublicKeys(enableTimeout = false) {
    return new Promise((resolve, reject) => {
      if (!this._isConnected) {
        // keepass.handleError(tab, kpErrors.TIMEOUT_OR_NOT_CONNECTED);
        reject(false);
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


      this._sendNativeMessage(request, enableTimeout).then((response) => {
        // Keepass.setcurrentKeePassXCVersion(response.version);
        this._currentKeePassXC = response.version;

        if (!this._verifyKeyResponse(response, key, incrementedNonce)) {
          // if (tab && page.tabs[tab.id]) {
          //   // keepass.handleError(tab, kpErrors.KEY_CHANGE_FAILED);
          //   reject(false);
          // }
        } else {
          this._isKeePassXCAvailable = true;
          console.log('Server public key: ' + nacl.util.encodeBase64(this._serverPublicKey));
        }
        resolve(true);
      }).catch(err => console.log(err));
    });
  };

  _verifyKeyResponse(response, key, nonce) {
    if (!response.success || !response.publicKey) {
      // keepass.associated.hash = null;
      return false;
    }

    let reply = false;
    if (!this._checkNonceLength(response.nonce)) {
      console.log('Error: Invalid nonce length');
      return false;
    }

    reply = (response.nonce === nonce);

    if (response.publicKey) {
      this._serverPublicKey = nacl.util.decodeBase64(response.publicKey);
      reply = true;
    }

    return reply;
  };

  _checkNonceLength(nonce) {
    return nacl.util.decodeBase64(nonce).length === nacl.secretbox.nonceLength;
  };

  _getNonce() {
    return nacl.util.encodeBase64(nacl.randomBytes(this._keySize));
  };

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

    // if (submiturl) {
    //   messageData.submitUrl = submiturl;
    // }

    // if (httpAuth) {
    //   messageData.httpAuth = 'true';
    // }

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
          // callback([]);
          return;
        }

        const message = nacl.util.encodeUTF8(res);
        const parsed = JSON.parse(message);
        // this.setcurrentKeePassXCVersion(parsed.version);

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
        // keepass.handleError(tab, response.errorCode, response.error);
        // callback([]);
      } else {
        // browserAction.showDefault(null, tab);
        // callback([]);
      }
    });
    // }, tab, false, triggerUnlock);

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

// };

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
  };

  _verifyDatabaseResponse(response, nonce) {
    if (response.success !== 'true') {
      this.associated.hash = null;
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

    this.associated.hash = response.hash;
    return response.hash !== '' && response.success === 'true';
  };

  _decrypt(input, nonce) {
    const m = nacl.util.decodeBase64(input);
    const n = nacl.util.decodeBase64(nonce);
    return nacl.box.open(m, n, this._serverPublicKey, this._keyPair.secretKey);
  };

  _getDatabaseHash(enableTimeout = false, triggerUnlock = false) {
    if (!this._isConnected) {
      // Keepass.handleError(tab, kpErrors.TIMEOUT_OR_NOT_CONNECTED);
      // callback([]);
      return;
    }

    if (!this._serverPublicKey) {
      this._changePublicKeys();
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
      callback(this._databaseHash);
      return;
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
          // callback('');
          return '';
          // return;
        }

        const message = nacl.util.encodeUTF8(res);
        const parsed = JSON.parse(message);
        if (this._verifyDatabaseResponse(parsed, incrementedNonce) && parsed.hash) {
          const oldDatabaseHash = this._databaseHash;
          // Keepass.setcurrentKeePassXCVersion(parsed.version);
          this._databaseHash = parsed.hash || '';

          if (oldDatabaseHash && oldDatabaseHash != Keepass.databaseHash) {
            this.associated.value = false;
            this.associated.hash = null;
          }

          this.isDatabaseClosed = false;
          this.isKeePassXCAvailable = true;
          return parsed.hash;
          // return;
        } else if (parsed.errorCode) {
          this._databaseHash = '';
          this.isDatabaseClosed = true;
          // Keepass.handleError(tab, kpErrors.DATABASE_NOT_OPENED);
          return this._databaseHash;
          // return;
        }
      } else {
        this._databaseHash = '';
        this.isDatabaseClosed = true;
        if (response.message && response.message === '') {
          this.isKeePassXCAvailable = false;
          // keepass.handleError(tab, kpErrors.TIMEOUT_OR_NOT_CONNECTED);
        } else {
          // keepass.handleError(tab, response.errorCode, response.error);
        }
        return this._databaseHash;
        // return;
      }
    });
  };

}
