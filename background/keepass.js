/**
 * This file holds the main API to the Keepass Database
 */

var Keepass = {};

Keepass.settings = {
};

Keepass.state = {
    associated: false,
    database: {
        id: null,
        key: null, // TODO store not base64'ed key
        hash: null
    }
};

Keepass.helpers = {};


Keepass.helpers.verifyResponse = function (response) {
    if (!response.Success) {
        Keepass.state.associated = false;
        return false;
    }

    var iv = response.Nonce;
    var value = Crypto.decryptAsString(response.Verifier, Keepass.state.database.key, iv);

    if (value !== iv) {
        Keepass.state.associated = false;
        return false;
    }

    if (response.Id !== Keepass.state.database.id) {
        Keepass.state.associated = false;
        return false;
    }

    if (response.Hash !== Keepass.state.database.hash) {
        Keepass.state.associated = false;
        return false;
    }

    return true;

};

Keepass.helpers.decryptEntry = function (entry, iv) {
    var decryptedEntry = {};
    decryptedEntry.Uuid = Crypto.decryptAsString(entry.Uuid, Keepass.state.database.key, iv);
    decryptedEntry.Name = UTF8.decode(Crypto.decryptAsString(entry.Name, Keepass.state.database.key, iv));
    decryptedEntry.Login = UTF8.decode(Crypto.decryptAsString(entry.Login, Keepass.state.database.key, iv));
    decryptedEntry.Password = UTF8.decode(Crypto.decryptAsString(entry.Password, Keepass.state.database.key, iv));

    if(entry.StringFields) {
        for(var i = 0; i < entry.StringFields.length; i++) {
            decryptedEntry.StringFields[i].Key = UTF8.decode(Crypto.decryptAsString(entry.StringFields[i].Key, Keepass.state.database.key, iv));
            decryptedEntry.StringFields[i].Value = UTF8.decode(Crypto.decryptAsString(entry.StringFields[i].Value, Keepass.state.database.key, iv));
        }
    }

    return decryptedEntry;
};

Keepass.isAssociated = function() {
    return Keepass.state.associated;
};


Keepass.reCheckAssociated = function() {
    // TODO
    // reqwest({
    //     url: 'http://localhost:19455', // TODO hard coded path
    //     type: 'json',
    //     method: 'post',
    //     data: JSON.stringify({"RequestType":"test-associate","TriggerUnlock":false}),
    //     contentType: "application/json",
    //     error: function (err) {
    //
    //     },
    //     success: function (resp) {
    //         console.log(resp)
    //         if (!resp.Success) {
    //             console.log("Not associated!");
    //             // {
    //             //     "RequestType":"associate",
    //             //     "Key":"CRyXRbH9vBkdPrkdm52S3bTG2rGtnYuyJttk/mlJ15g=", // Base64 encoded 256 bit key
    //             //     "Nonce":"epIt2nuAZbHt5JgEsxolWg==",
    //             //     "Verifier":"Lj+3N58jkjoxS2zNRmTpeQ4g065OlFfJsHNQWYaOJto="
    //             // }
    //
    //         }
    //     }
    // })

};

Keepass.getLogins = function (url, callback) {
    console.log("Getlogins for url " + url);

    if (!Keepass.state.associated) {
        Keepass.associate(function() {
            Keepass.getLogins(url, callback);
        });
        return;
    }

    var verifiers = Crypto.generateVerifier(Keepass.state.database.key);

    var req = {
        RequestType: "get-logins",
        SortSelection: true,
        TriggerUnlock: false,
        Nonce: verifiers[0],
        Verifier: verifiers[1],
        Id: Keepass.state.database.id,
        Url: Crypto.encrypt(url, Keepass.state.database.key, verifiers[0]),
        SubmitUrl: null
    };

    browser.storage.local.get("keepass-server-url").then(function(pref) {
        reqwest({
            url: pref["keepass-server-url"] || 'http://localhost:19455',
            type: 'json',
            method: 'post',
            data: JSON.stringify(req),
            contentType: "application/json",
            error: function (err) {

            },
            success: function (resp) {
                if (Keepass.helpers.verifyResponse(resp)) {
                    var rIv = resp.Nonce;
                    var decryptedEntries = [];
                    for (var i = 0; i < resp.Entries.length; i++) {
                        var decryptedEntry = Keepass.helpers.decryptEntry(resp.Entries[i], rIv);
                        decryptedEntries.push(decryptedEntry);
                        console.log(decryptedEntries);
                    }
                    callback(decryptedEntries);
                }
                else {
                    console.log("RetrieveCredentials for " + url + " rejected");
                }
            }
        })
    });
};

Keepass.associate = function(callback) {

    var rawKey = cryptoHelpers.generateSharedKey(Crypto.keySize * 2);
    var key = btoa(cryptoHelpers.convertByteArrayToString(rawKey));
    var verifiers = Crypto.generateVerifier(key);

    var req = {
        RequestType: "associate",
        Key: key,
        Nonce: verifiers[0],
        Verifier: verifiers[1]
    };

    browser.storage.local.get("keepass-server-url").then(function(pref) {
        reqwest({
            url: pref["keepass-server-url"] || 'http://localhost:19455',
            type: 'json',
            method: 'post',
            data: JSON.stringify(req),
            contentType: "application/json",
            error: function (err) {

            },
            success: function (resp) {
                console.log(resp);
                console.log("Associated key is: " + key);
                console.log("Id is: " + resp.Id);
                console.log("Hash is: " + resp.Hash);
                Keepass.state.database.id = resp.Id;
                Keepass.state.database.key = key;
                Keepass.state.database.hash = resp.Hash;
                Keepass.state.associated = true;
                callback();
            }
        })
    });
};

browser.storage.onChanged.addListener(function(changes, areaName) {
    if (changes.hasOwnProperty("keepass-server-url")) {
        Keepass.state.associated = false;
    }
})
