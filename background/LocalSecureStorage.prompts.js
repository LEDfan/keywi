/**
 * @copyright Tobia De Koninck
 * @copyright Robin Jadoul
 *
 * This file is part of Keywi.
 * Keywi is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Keywi is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with Keywi.  If not, see <http://www.gnu.org/licenses/>.
 */

LocalSecureStorage.prompts = {};

LocalSecureStorage.prompts.setWindowSize = function(width, height) {
    this.windowWidth = width;
    this.windowHeight = height;
};

LocalSecureStorage.prompts.setupNewPassword = function () {
    let self = this;
    return new Promise(function (resolve, reject) {
        const url = browser.extension.getURL('dialog/setup_secure_storage.html');
        browser.windows.create({
            type: 'panel',
            width: self.windowWidth,
            height: self.windowHeight,
            incognito: false,
            url: url
        }).then(function(newWindow) {
            const openedWindowId = newWindow.id;
            let onRemoved = function(removedWindowId) {
                if (openedWindowId === removedWindowId) {
                    console.log("Setup storage was aborted!");
                    browser.notifications.create("secure-storage-cancelled", {
                        type: "basic",
                        iconUrl: browser.extension.getURL("icons/keywi-96.png"),
                        title: "Keywi",
                        message: "Secure Storage Setup was canceled, Keywi cannot work without. You can re-setup it from the settings."
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
    let self = this;
    return new Promise(function (resolve, reject) {
        const url = browser.extension.getURL('dialog/unlock_secure_storage.html');
        browser.windows.create({
            type: 'panel',
            width: self.windowWidth,
            height: self.windowHeight,
            incognito: false,
            url: url
        }).then(function(newWindow) {
            const openedWindowId = newWindow.id;
            let onRemoved = function(removedWindowId) {
                if (openedWindowId === removedWindowId) {
                    console.log("Unlock Secure storage was aborted!");
                    browser.notifications.create("secure-storage-cancelled", {
                        type: "basic",
                        iconUrl: browser.extension.getURL("icons/keywi-96.png"),
                        title: "Keywi",
                        message: "Secure Storage unlock was canceled, Keywi cannot work without."
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
