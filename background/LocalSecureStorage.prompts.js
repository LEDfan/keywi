LocalSecureStorage.prompts = {};

LocalSecureStorage.prompts.setupNewPassword = function () {
    return new Promise(function (resolve, reject) {
        browser.tabs.create({
            url: browser.extension.getURL('dialog/setup_secure_storage.html'),
            active: false
        }, function (tab) {
            // After the tab has been created, open a window to inject the tab
            browser.windows.create({
                tabId: tab.id,
                type: 'panel',
                width: 400,
                height: 600
            }).then(function(newWindow) {
                let onRemoved = function(tabId, removeInfo) {
                    if (tabId == tab.id) {
                        console.log("Setup storage was aborted!");
                        browser.notifications.create({
                            "type": "basic",
                            "iconUrl": browser.extension.getURL("icons/keepass-96.png"),
                            "title": "{Keepass}",
                            "message": "Secure Storage Setup was canceled, {Keepass} cannot work without. You can re-setup it from the settings."
                        });
                    }
                };

                browser.runtime.onMessage.addListener(function _func(request, sender, sendResponse) {
                    if (request.type === "ss_setup_password_user_input") {
                        resolve(request.data.password);
                        browser.runtime.onMessage.removeListener(_func);
                        browser.tabs.onRemoved.removeListener(onRemoved);
                        browser.windows.remove(newWindow.id);
                    }
                });
                browser.tabs.onRemoved.addListener(onRemoved);
            });
        });

    });
};

LocalSecureStorage.prompts.unlock = function () {
    return new Promise(function (resolve, reject) {
        browser.tabs.create({
            url: browser.extension.getURL('dialog/unlock_secure_storage.html'),
            active: false
        }, function (tab) {
            // After the tab has been created, open a window to inject the tab
            browser.windows.create({
                tabId: tab.id,
                type: 'panel',
                width: 400,
                height: 600
            }).then(function(newWindow) {
                let onRemoved = function(tabId, removeInfo) {
                    if (tabId == tab.id) {
                        console.log("Unlock Secure storage was aborted!");
                        browser.notifications.create({
                            "type": "basic",
                            "iconUrl": browser.extension.getURL("icons/keepass-96.png"),
                            "title": "{Keepass}",
                            "message": "Secure Storage unlock was canceled, {Keepass} cannot work without."
                        });
                    }
                };
                browser.runtime.onMessage.addListener(function _func(request, sender, sendResponse) {
                    if (request.type === "ss_unlock_user_input") {
                        resolve(request.data.password);
                        browser.runtime.onMessage.removeListener(_func);
                        browser.tabs.onRemoved.removeListener(onRemoved);
                        browser.windows.remove(newWindow.id);
                    }
                });
                browser.tabs.onRemoved.addListener(onRemoved);
            });
        });
    });
};
