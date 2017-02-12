/**
 * This file holds the main API to the Keepass Database
 */

var Keepass = {};

Keepass._ss = null;

Keepass.settings = {
};

Keepass.state = {
    associated: false,
};

Keepass.helpers = {};

Keepass.helpers.verifyResponse = function (response, key) {
    let self = this;
    return new Promise(function(resolve, reject) {
        if (!response.Success) {
            reject();
            return;
        }

        var iv = response.Nonce;
        var value = Crypto.decryptAsString(response.Verifier, key, iv);

        if (value !== iv) {
            Keepass.state.associated = false;
            reject();
            return;
        }

        Keepass._ss.get("database.id").then(function(data) {
            if (response.Id !== data){
                Keepass.state.associated = false;
                reject();
            }
        }).then(function() {
            Keepass._ss.get("database.hash").then(function(data) {
                if (response.Hash !== data){
                    Keepass.state.associated = false;
                    reject();
                }
            });
        });

        resolve();

    });
};

Keepass.helpers.decryptEntry = function (entry, iv) {
    let self = this;
    return new Promise(function(resolve, reject) {
        Keepass._ss.get("database.key").then(function(key) {
            var decryptedEntry = {};
            decryptedEntry.Uuid = Crypto.decryptAsString(entry.Uuid, key, iv);
            decryptedEntry.Name = UTF8.decode(Crypto.decryptAsString(entry.Name, key, iv));
            decryptedEntry.Login = UTF8.decode(Crypto.decryptAsString(entry.Login, key, iv));
            decryptedEntry.Password = UTF8.decode(Crypto.decryptAsString(entry.Password, key, iv));

            if(entry.StringFields) {
                for(var i = 0; i < entry.StringFields.length; i++) {
                    decryptedEntry.StringFields[i].Key = UTF8.decode(Crypto.decryptAsString(entry.StringFields[i].Key, key, iv));
                    decryptedEntry.StringFields[i].Value = UTF8.decode(Crypto.decryptAsString(entry.StringFields[i].Value, key, iv));
                }
            }

            resolve(decryptedEntry);
        });
    });
};

Keepass.prompts = {};

Keepass.prompts._selectCredentials = function(possibleCredentials) {
    return new Promise(function(resolve, reject) {
        const url = browser.extension.getURL('dialog/select_multiple_passwords.html');
        browser.windows.create({
            // tabId: tab.id,
            type: 'panel',
            width: 400,
            height: 600,
            incognito: false,
            url: url
        }).then(function(newWindow) {
            const openedWindowId = newWindow.id;
            let onRemoved = function(removedWindowId) {
                if (openedWindowId === removedWindowId) {
                    console.log("Select multiple passwords canceled");
                    reject("Aborted!");
                }
            };

            browser.tabs.query({windowId: openedWindowId}).then(function(tabs) {
                const openedTabId = tabs[0].id;

                browser.tabs.onUpdated.addListener(function _updateFunc(tabId, changeInfo, tabInfo) {
                    if (tabId === openedTabId) {
                        console.log(tabInfo);
                        if (tabInfo.status === "complete") {
                            setTimeout(function() {
                                browser.tabs.sendMessage(openedTabId, {
                                    type: "select_mul_pass_data",
                                    data: {possibleCredentials: possibleCredentials}
                                });
                                browser.tabs.onUpdated.removeListener(_updateFunc);
                            }, 300);
                        }
                    }
                });
                browser.runtime.onMessage.addListener(function _func(request, sender, sendResponse) {
                    if (request.type === "select_mul_pass_user_input") {
                        let selCred = possibleCredentials[request.data.selected];
                        browser.runtime.onMessage.removeListener(_func);
                        browser.windows.onRemoved.removeListener(onRemoved);
                        browser.windows.remove(newWindow.id);
                        resolve(selCred);
                    } else if (request.type === "select_mul_pass_cancel") {
                        browser.runtime.onMessage.removeListener(_func);
                        browser.windows.onRemoved.removeListener(onRemoved);
                        browser.windows.remove(newWindow.id);
                        onRemoved(openedWindowId);
                        reject();
                    }
                });
                browser.windows.onRemoved.addListener(onRemoved);
            });
        });
    });
};

Keepass.ready = function() {
    return Keepass.state.associated && Keepass._ss.ready();
};

Keepass.setSecureStorage = function(ss) {
    Keepass._ss = ss;
};

// Keepass.isAssociated = function() {
//     return Keepass.state.associated;
// };

Keepass.reCheckAssociated = function() {
   return new Promise(function(resolve, reject) {
       Keepass._ss.get("database.key").then(function(key) {
           Keepass._ss.get("database.id").then(function(id) {
               var verifiers = Crypto.generateVerifier(key);

               var req = {
                   RequestType: "test-associate",
                   Key: key,
                   Nonce: verifiers[0],
                   Verifier: verifiers[1],
                   Id: id
               };

               browser.storage.local.get("keepass-server-url").then(function(pref) {
                   reqwest({
                       url: pref["keepass-server-url"] || 'http://localhost:19455',
                       type: 'json',
                       method: 'post',
                       data: JSON.stringify(req),
                       contentType: "application/json",
                       error: function(err) {
                            // TODO resolve(false)
                       },
                       success: function(resp) {
                           if (resp.Success) {
                               Keepass.state.associated = true;
                           } else {
                               Keepass.state.associated = false;
                           }
                           resolve(resp.Success);
                       }
                   });
               });
           }).catch(function() {
               Keepass.state.associated = false;
               resolve(false);
           });
       }).catch(function() {
           Keepass.state.associated = false;
           resolve(false);
       });
   });

};

Keepass.getLogins = function (url, callback) {
    console.log("Getlogins for url " + url);

    if (!this.ready()) {
        Keepass.associate(function() {
            Keepass.getLogins(url, callback);
        });
        return;
    }

    let self = this;

    Keepass._ss.get("database.key").then(function(key) {
        Keepass._ss.get("database.id").then(function(id) {
            console.log("key, id:");
            console.log(key);
            console.log(id);

            var verifiers = Crypto.generateVerifier(key);

            var req = {
                RequestType: "get-logins",
                SortSelection: true,
                TriggerUnlock: false,
                Nonce: verifiers[0],
                Verifier: verifiers[1],
                Id: id,
                Url: Crypto.encrypt(url, key, verifiers[0]),
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
                        browser.notifications.create({
                            type: "basic",
                            message: "Cannot connect to your Keepass database, is it running and unlocked?",
                            iconUrl: browser.extension.getURL("icons/keepass-96.png"),
                            title: "{Keepass}"
                        });
                    },
                    success: function (resp) {
                        Keepass.helpers.verifyResponse(resp, key).then(function() {
                            let rIv = resp.Nonce;
                            let decryptedEntries = [];
                            let promiseChain = Promise.resolve();
                            for (let i = 0; i < resp.Entries.length; i++) {
                                promiseChain = promiseChain.then(function() {
                                    return Keepass.helpers.decryptEntry(resp.Entries[i], rIv).then(function(decryptedEntry) {
                                        // callback([decryptedEntry]);
                                        decryptedEntries.push(decryptedEntry);
                                    });
                                });
                            }
                            promiseChain.then(function() {
                                // decrypted all entries
                                if (decryptedEntries.length === 0) {
                                    browser.notifications.create({
                                        type: "basic",
                                        message: "No passwords found",
                                        iconUrl: browser.extension.getURL("icons/keepass-96.png"),
                                        title: "{Keepass}"
                                    }); // TODO replace by injected message
                                } else if (decryptedEntries.length === 1) {
                                    callback(decryptedEntries[0]);
                                } else {
                                    self.prompts._selectCredentials(decryptedEntries).then(function(selectedCredential) {
                                        callback(selectedCredential);
                                    });

                                }
                            });


                        }).catch(function(resp) {
                            console.log("RetrieveCredentials for " + url + " rejected");

                            browser.notifications.create({
                                type: "basic",
                                message: "Problem getting logins from your Keepass database, have you associated with this database?",
                                iconUrl: browser.extension.getURL("icons/keepass-96.png"),
                                title: "{Keepass}"
                            });
                        });
                    }
                });
            });
        });
    });
};

Keepass.deassociate = function() {
    return Keepass._ss.delete("database.id").then(function() {
        return Keepass._ss.delete("database.key");
    }).then(function() {
        return Keepass._ss.delete("database.hash");
    }).then(function() {
        Keepass._encryptionkey = null;
        Keepass.state.associated = false;
    });
};

Keepass.associate = function(callback) {

    if (!Keepass._ss.ready()) {
        // if the secure storage isn't ready yet, first re initialize it
        // before associating the keepass database
        // If it was done the other way around, then if setting up the secure storage would fail
        // the association request would still be done, but the result couldn't be saved
        Keepass._ss.reInitialize().then(function() {
            Keepass.associate(callback);
        });
        return;
    }

    // test if we are already associated and it's working
    this.reCheckAssociated().then(function(associated) {
        if (associated) {
            callback();
        } else {
            var rawKey = cryptoHelpers.generateSharedKey(Crypto.keySize * 2);
            var key = btoa(cryptoHelpers.convertByteArrayToString(rawKey));
            var verifiers = Crypto.generateVerifier(key);

            var req = {
                RequestType: "associate",
                Key: key,
                Nonce: verifiers[0],
                Verifier: verifiers[1]
            };
            let self = this;

            browser.storage.local.get("keepass-server-url").then(function(pref) {
                reqwest({
                    url: pref["keepass-server-url"] || 'http://localhost:19455',
                    type: 'json',
                    method: 'post',
                    data: JSON.stringify(req),
                    contentType: "application/json",
                    error: function(err) {
                        browser.notifications.create({
                            type: "basic",
                            message: "Cannot connect to your Keepass database, is it running and unlocked?",
                            iconUrl: browser.extension.getURL("icons/keepass-96.png"),
                            title: "{Keepass}"
                        });
                    },
                    success: function(resp) {
                        console.log(resp);
                        if (resp.Success) {
                            console.log(resp);
                            console.log("Associated key is: " + key);
                            console.log("Id is: " + resp.Id);
                            console.log("Hash is: " + resp.Hash);
                            Keepass._ss.set("database.id", resp.Id).then(function() {
                                return Keepass._ss.set("database.key", key);
                            }).then(function() {
                                return Keepass._ss.set("database.hash", resp.Hash);
                            }).then(function() {
                                Keepass.state.associated = true;
                                callback();
                            })
                        } else {
                            browser.notifications.create({
                                type: "basic",
                                message: "Something went wrong during association.",
                                iconUrl: browser.extension.getURL("icons/keepass-96.png"),
                                title: "{Keepass}"
                            });
                        }
                    }
                });
            });
        }
    });
};

browser.storage.onChanged.addListener(function(changes, areaName) {
    console.log(changes);
    if (changes.hasOwnProperty("keepass-server-url")) {
        Keepass.state.associated = false;
    }
    if (changes.hasOwnProperty("password-hash-rounds")) {
        Keepass._ss.reencrypt();
    }
});

browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === "re-encrypt_local_secure_storage") {
        Keepass._ss.reencrypt(function() {
            sendResponse();
        });
        return true;
    } else if (request.type === "reset") {
        Keepass._ss.clear().then(function() {
            return Keepass._ss.reInitialize();
        }).then(function() {
            Keepass.associate(function() {
                sendResponse();
            });
        }).catch(function() {
            sendResponse();
        });
        return true;
    } else if (request.type === "options_user_info") {
        let hash = null;
        let id = null;
        if (Keepass.ready()) {
            Keepass._ss.get("database.hash").then(function(data) {
                hash = data;
                Keepass._ss.get("database.id").then(function(data) {
                    id = data;
                    sendResponse({
                        "Secure storage unlocked": Keepass._ss.ready(),
                        "Keepass database associated": Keepass.ready(),
                        "Keepass database hash": hash,
                        "Keepass database id": id
                    });
                });
            }).catch(function() {
                sendResponse({
                    "Secure storage unlocked": Keepass._ss.ready(),
                    "Keepass database associated": Keepass.ready(),
                });
            });
        } else {
            sendResponse({
                "Secure storage unlocked": Keepass._ss.ready(),
                "Keepass database associated": Keepass.ready(),
            });
        }
        return true; // http://stackoverflow.com/a/40773823
    }
});
