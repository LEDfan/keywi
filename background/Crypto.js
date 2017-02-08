var Crypto = {};

Crypto.keySize = 8;

Crypto.encrypt = function (input, key, iv) {
    return btoa(cryptoHelpers.convertByteArrayToString(
        slowAES.encrypt(
            cryptoHelpers.convertStringToByteArray(input),
            slowAES.modeOfOperation.CBC,
            cryptoHelpers.convertStringToByteArray(atob(key)),
            cryptoHelpers.convertStringToByteArray(atob(iv)
            )
        )));
};

Crypto.decryptAsString = function (input, key, iv) {
    var output = slowAES.decrypt(
        cryptoHelpers.convertStringToByteArray(atob(input)),
        slowAES.modeOfOperation.CBC,
        cryptoHelpers.convertStringToByteArray(atob(key)),
        cryptoHelpers.convertStringToByteArray(atob(iv))
    );
    return cryptoHelpers.convertByteArrayToString(output);
};

Crypto.generateVerifier = function (inputKey) {
    var iv = cryptoHelpers.generateSharedKey(Crypto.keySize);
    var nonce = btoa(cryptoHelpers.convertByteArrayToString(iv));
    var verifier = this.encrypt(nonce, inputKey, nonce);

    return [nonce, verifier];
};

Crypto._getSalt = function (overwritesalt) {
    return new Promise(function (resolve, reject) {
        function _newSalt() {
            let newSalt = new Uint8Array(100);
            window.crypto.getRandomValues(newSalt);
            console.log(newSalt);
            browser.storage.local.set({"crypto_salt": JSON.stringify(Array.from(newSalt))}).then(function () {
                // make sure it's stored, we don't want to work with a not-stored salt
                resolve(newSalt);
            });
        }
        if (overwritesalt) {
            _newSalt();
        } else {
            browser.storage.local.get("crypto_salt").then(function (data) {
                if (Object.keys(data).length !== 0) {
                    resolve(new Uint8Array(JSON.parse(data.crypto_salt)));
                } else {
                    _newSalt();
                }
            }).catch(function (error) {
                reject(error);
            });
        }
    });
};

Crypto.deriveKey = function (userKey, overwriteSalt = false) {
    var encoder = new TextEncoder("utf-8");
    var enUserKey = encoder.encode(userKey);
    return Crypto._getSalt(overwriteSalt).then(function (salt) {
        return window.crypto.subtle.importKey(
            "raw", //only "raw" is allowed
            enUserKey,
            {
                name: "PBKDF2"
            },
            false, //whether the key is extractable (i.e. can be used in exportKey)
            ["deriveKey"] //can be any combination of "deriveKey" and "deriveBits"
        ).then(function(key){
            //returns a key object
            return browser.storage.local.get("password-hash-rounds").then(function(storageResponse) {
                console.log(Math.max(5000, Number.parseInt(storageResponse["password-hash-rounds"]) || 0));
                return window.crypto.subtle.deriveKey(
                    {
                        "name": "PBKDF2",
                        salt: salt,
                        iterations: Math.max(5000, Number.parseInt(storageResponse["password-hash-rounds"]) || 0),
                        hash: {name: "SHA-512"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
                    },
                    key, //your key from generateKey or importKey
                    { //the key type you want to create based on the derived bits
                        name: "AES-CBC", //can be any AES algorithm ("AES-CTR", "AES-CBC", "AES-CMAC", "AES-GCM", "AES-CFB", "AES-KW", "ECDH", "DH", or "HMAC")
                        // the generateKey parameters for that type of algorithm
                        length: 256, //can be  128, 192, or 256
                    },
                    true, //whether the derived key is extractable (i.e. can be used in exportKey)
                    ["encrypt", "decrypt"] //limited to the options in that algorithm's importKey
                );
            }).then(function (derivedKey) {
                return window.crypto.subtle.exportKey("raw", derivedKey);
            }).then(function (encryptionKey) {
                var u8 = new Uint8Array(encryptionKey);
                return btoa(String.fromCharCode.apply(null, u8));
            }).catch(function(err) {
                console.error(err);
            });
        });
    });
};
