function SecureStorage() {
}

SecureStorage.prototype.cache = {};

SecureStorage.prototype._hasCache = function (key) {
    if (typeof this.cache[key] === 'undefined') {
        return false;
    }
    return true;
};

SecureStorage.prototype._setCache = function (key, value) {
    this.cache[key] = value;
};

SecureStorage.prototype._getCache = function (key) {
    return this.cache[key];
};

SecureStorage.prototype.set = function (key, value, cache = true) {};
SecureStorage.prototype.has = function (key) {};
SecureStorage.prototype.get = function (key, cache = true) {};
SecureStorage.prototype.delete = function (key) {};
SecureStorage.prototype.constructor = SecureStorage;








