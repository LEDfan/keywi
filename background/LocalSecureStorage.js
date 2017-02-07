function LocalSecureStorage() {
}

LocalSecureStorage.prototype = new SecureStorage();

LocalSecureStorage.prototype.has = function(key, onHas, onNotHas) {
    browser.storage.local.get(key, function (data) {
        if (Object.keys(data).length === 0) {
            onNotHas();
        } else {
            onHas();
        }
    });
};

LocalSecureStorage.prototype.set = function(key, value, done) {
    this.has(key, function(value) {
        console.log("has!");
        console.log(value);
    }, function() {
        console.log("doesn't has!");
        confirmFromBg("Fill in a new password for the secure storage.. (TODO)", function (keyToStorage) {
            // SecureStorage.prototype._setCache(key, value);
            console.log("The key is: " + keyToStorage);
            var verifiers = Keepass.helpers.getVerifier(keyToStorage);
            console.log(verifiers);


            var data = {};
            data[key] = {
                data: Keepass.helpers.encrypt(value, keyToStorage, verifiers[0]),
                nonce: verifiers[0]
            };

            console.log("Storing data:");
            console.log(data);

            browser.storage.local.set(data);

            done();
        });
    });


};

LocalSecureStorage.prototype.get = function (key, done) {
    confirmFromBg("Fill in the existing password for the secure storage.. (TODO)", function (keyToStorage) {
        console.log("The key is: " + keyToStorage);
        var verifiers = Keepass.helpers.getVerifier(keyToStorage);
        console.log(verifiers);

        browser.storage.local.get(key).then(function(data) {
            console.log("Fethced form storage:");
            console.log(data);
            var actualData = data[key];
            var res = Keepass.helpers.decryptAsString(actualData.data, actualData.nonce);
            var output = slowAES.decrypt(
                cryptoHelpers.convertStringToByteArray(atob(actualData.data)),
                slowAES.modeOfOperation.CBC,
                cryptoHelpers.convertStringToByteArray(atob(keyToStorage)),
                cryptoHelpers.convertStringToByteArray(atob(actualData.nonce))
            );
            var res = cryptoHelpers.convertByteArrayToString(output);
            done(res);
        });

    });
};

LocalSecureStorage.prototype.delete = function (key) {

};
