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
                browser.runtime.onMessage.addListener(function _func(request, sender, sendResponse) {
                    if (request.type === "ss_setup_password_user_input") {
                        resolve(request.data.password);
                        browser.windows.remove(newWindow.id);
                        browser.runtime.onMessage.removeListener(_func);
                    }
                });
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
                browser.runtime.onMessage.addListener(function _func(request, sender, sendResponse) {
                    if (request.type === "ss_unlock_user_input") {
                        resolve(request.data.password);
                        browser.windows.remove(newWindow.id);
                        browser.runtime.onMessage.removeListener(_func);
                    }
                });
            });
        });
    });
};
