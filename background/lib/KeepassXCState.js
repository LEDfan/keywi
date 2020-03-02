
class State {

  constructor() {
    this._nativeHostName = 'org.keepassxc.keepassxc_browser';
    this._associated = {'value': false, 'hash': null};
    this._keyRing = {};
    this._keyPair = {};
    this._nativePort = null;
    this._isConnected = false;
    this._clientID = null;
    this._keySize = 24;
    this._serverPublicKey = null;
    this._databaseHash = null;
    this._currentKeePassXC = ''; // version
  }

  dump() {
    for (let propName of Object.keys(this)) {
      let propValue = this[propName];

      console.log(propName, propValue);
    }
  }

  newKeyPair(keyPair) {
    let newState = new State();

    Object.assign(newState, this);
    newState._keyPair = keyPair;
    Object.freeze(newState);

    return newState
  }

  setKeyRing(keyRing) {
    let newState = new State();

    Object.assign(newState, this);
    newState._keyRing = keyRing;
    Object.freeze(newState);

    return newState
  }

  resetKeyRing() {
    return this.setKeyRing({})
  }

  connectToNativePort(onDisconnect) {
    let newState = new State();

    Object.assign(newState, this);

    newState._nativePort = browser.runtime.connectNative(this._nativeHostName);
    newState._nativePort.onDisconnect.addListener(onDisconnect)
    newState._isConnected = true;

    Object.freeze(newState);

    return newState
  }

  disAssociated() {
    let newState = new State();

    Object.assign(newState, this);
    newState._associated.hash = null;
    newState._associated.value = false;
    Object.freeze(newState);

    return newState
  }

  setAssociatedHash(hash) {
    let newState = new State();

    Object.assign(newState, this);
    newState._associated.hash = hash;
    newState._associated.value = true;
    Object.freeze(newState);

    return newState
  }

  setAssociated(hash) {
    let newState = new State();

    Object.assign(newState, this);
    newState._associated.hash = hash;
    newState._associated.value = true;
    Object.freeze(newState);

    return newState
  }

  setServerPublicKey(serverPublicKey) {
    let newState = new State();

    Object.assign(newState, this);
    newState._serverPublicKey = serverPublicKey;
    Object.freeze(newState);

    return newState
  }

  newDatabaseHash(hash) {
    let newState = new State();

    Object.assign(newState, this);
    newState._databaseHash = hash;
    Object.freeze(newState);

    return newState
  }

  resetDatabaseHash() {
    // set to error state
    let newState = new State();

    Object.assign(newState, this);
    newState._databaseHash = null;
    Object.freeze(newState);

    return newState
  }

  saveKeyInKeyring(hash, id, key) {
    let newState = new State();

    Object.assign(newState, this);
    if (!(hash in newState._keyRing)) {
      newState._keyRing[hash] = {
        id: id,
        key: key,
        hash: hash,
        created: new Date().valueOf(),
        lastUsed: new Date().valueOf()
      };
    } else {
      newState._keyRing[hash].id = id;
      newState._keyRing[hash].key = key;
      newState._keyRing[hash].hash = hash;
    }

    Object.freeze(newState);
    return newState;
  }

  deleteKeyFromKeyRing(hash) {
    let newState = new State();

    Object.assign(newState, this);
    delete newState._keyRing[hash];
    Object.freeze(newState);
    return newState;
  }

  setClientID(clientID) {
    let newState = new State();

    Object.assign(newState, this);
    newState._clientID = clientID;
    Object.freeze(newState);

    return newState
  }

  setKeepassXCVersion(version) {
    let newState = new State();

    Object.assign(newState, this);
    newState._currentKeePassXC = version;
    Object.freeze(newState);

    return newState
  }

  isConnectedToNativePort() {
    return this._isConnected;
  }

  hasServerPublicKey() {
    return !!this._serverPublicKey;
  }

  getServerPublicKey() {
    return this._serverPublicKey;
  }

  hashDatabaseHash() {
    return this._databaseHash !== null
  }

  hasHashInKeyRing(hash) {
    return hash in this._keyRing
  }

  getDatabaseHash() {
    return this._databaseHash;
  }

  isAssociatedWithCorrectDatabase() {
    return (this._associated.value && this._associated.hash && this._associated.hash === this._databaseHash);
  }

  getKeyRing() {
    return this._keyRing;
  }

  getKeyFromKeyRing(hash) {
    if (!this.hasHashInKeyRing(hash)) {
      return {dbid: null, dbkey: null};
    }
    let dbid = this._keyRing[hash].id;
    let dbkey = null;

    if (dbid) {
      dbkey = this._keyRing[hash].key;
    }

    return {dbid, dbkey};
  }

  getClientID() {
    return this._clientID;
  }

  getCurrentKeepassXCVersion() {
    return this._currentKeePassXC;
  }

}
