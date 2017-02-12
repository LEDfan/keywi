LocalSecureStorage.prompts = {};

LocalSecureStorage.prompts.setupNewPassword = function () {
    return new Promise(function (resolve, reject) {
        const url = browser.extension.getURL('dialog/setup_secure_storage.html');
        browser.windows.create({
            type: 'panel',
            width: 400,
            height: 600,
            incognito: false,
            url: url
        }).then(function(newWindow) {
            const openedWindowId = newWindow.id;
            let onRemoved = function(removedWindowId) {
                if (openedWindowId === removedWindowId) {
                    console.log("Setup storage was aborted!");
                    browser.notifications.create("secure-storage-cancelled", {
                        type: "basic",
                        iconUrl: browser.extension.getURL("icons/keepass-96.png"),
                        title: "{Keepass}",
                        message: "Secure Storage Setup was canceled, {Keepass} cannot work without. You can re-setup it from the settings."
                    });
                    reject("Aborted!");
                }
            };

            browser.runtime.onMessage.addListener(function _func(request, sender, sendResponse) {
                if (request.type === "ss_setup_password_user_input") {
                    resolve(request.data.password);
                    browser.runtime.onMessage.removeListener(_func);
                    browser.windows.onRemoved.removeListener(onRemoved);
                    browser.windows.remove(newWindow.id);
                } else if (request.type === "ss_setup_password_cancel") {
                    browser.runtime.onMessage.removeListener(_func);
                    browser.windows.onRemoved.removeListener(onRemoved);
                    browser.windows.remove(newWindow.id);
                    onRemoved(newWindow.id);
                }
            });
            browser.windows.onRemoved.addListener(onRemoved);
        });
    });
};

LocalSecureStorage.prompts.unlock = function (verifyFunc) {
    return new Promise(function (resolve, reject) {
        const url = browser.extension.getURL('dialog/unlock_secure_storage.html');
        browser.windows.create({
            type: 'panel',
            width: 400,
            height: 600,
            incognito: false,
            url: url
        }).then(function(newWindow) {
            const openedWindowId = newWindow.id;
            let onRemoved = function(removedWindowId) {
                if (openedWindowId === removedWindowId) {
                    console.log("Unlock Secure storage was aborted!");
                    browser.notifications.create("secure-storage-cancelled", {
                        type: "basic",
                        iconUrl: browser.extension.getURL("icons/keepass-96.png"),
                        title: "{Keepass}",
                        message: "Secure Storage unlock was canceled, {Keepass} cannot work without."
                    });
                    reject("Aborted!");
                }
            };
            browser.runtime.onMessage.addListener(function _func(request, sender, sendResponse) {
                if (request.type === "ss_unlock_user_input") {
                    /**
                     * Call the verifyfunction, this function will verify if the provided password/userKey is correct.
                     * If it's correct the first callback will be called, if it isn't correct the second callback will be called.
                     */
                    console.log(sender);
                    verifyFunc(request.data.password, function(key) {
                        // we're done here, cleanup and remove the window
                        browser.runtime.onMessage.removeListener(_func);
                        browser.windows.onRemoved.removeListener(onRemoved);
                        browser.windows.remove(newWindow.id);
                        resolve(key);
                    }, function(reason) {
                        // show an alert to the user
                        browser.tabs.sendMessage(sender.tab.id, {type: "ss_unlock_reject", msg: reason});
                    });
                } else if (request.type === "ss_unlock_cancel") {
                    browser.runtime.onMessage.removeListener(_func);
                    browser.windows.onRemoved.removeListener(onRemoved);
                    browser.windows.remove(newWindow.id);
                    onRemoved(newWindow.id);
                }
            });
            browser.windows.onRemoved.addListener(onRemoved);
        });
    });
};

browser.notifications.onClicked.addListener((notificationId) => {
    if (notificationId == "secure-storage-cancelled") {
        browser.runtime.openOptionsPage();
    }
});
