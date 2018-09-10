/**
 * @copyright (C) 2017 Tobia De Koninck
 * @copyright (C) 2017 Robin Jadoul
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
 *
 * You should have received a copy of the GNU General Public License
 * along with Keywi.  If not, see <http://www.gnu.org/licenses/>.
 */

LocalSecureStorage.prompts = {};

LocalSecureStorage.prompts.setupNewPassword = function () {
  return new Promise(function (resolve, reject) {
    const url = browser.extension.getURL('/dialog/setup_secure_storage.html');
    browser.windows.create({
      'type': 'panel',
      'width': 400,
      'height': 600,
      'url': url,
      // 'incognito': true
    }).then(function (newWindow) {
      const openedWindowId = newWindow.id;
      const onRemoved = function (removedWindowId) {
        if (openedWindowId === removedWindowId) {
          browser.notifications.create('secure-storage-cancelled', {
            'type': 'basic',
            'iconUrl': browser.extension.getURL('/icons/keywi-96.png'),
            'title': 'Keywi',
            'message': browser.i18n.getMessage('SSsetupCancelled')
          });
          reject('Aborted!');
        }
      };
      browser.runtime.onMessage.addListener(function _func (request, sender, sendResponse) {
        if (request.type === 'ss_setup_password_user_input') {
          resolve(request.data.password);
          browser.runtime.onMessage.removeListener(_func);
          browser.windows.onRemoved.removeListener(onRemoved);
          browser.windows.remove(newWindow.id);
        } else if (request.type === 'ss_setup_password_cancel') {
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
    const url = browser.extension.getURL('/dialog/unlock_secure_storage.html');
    browser.windows.create({
      'type': 'panel',
      'width': 400,
      'height': 600,
      'url': url,
      // 'incognito': true
    }).then(function (newWindow) {
      const openedWindowId = newWindow.id;
      const onRemoved = function (removedWindowId) {
        if (openedWindowId === removedWindowId) {
          browser.notifications.create('secure-storage-cancelled', {
            'type': 'basic',
            'iconUrl': browser.extension.getURL('/icons/keywi-96.png'),
            'title': 'Keywi',
            'message': browser.i18n.getMessage('SSunlockCancelled')
          });
          reject();
        }
      };
      browser.runtime.onMessage.addListener(function _func (request, sender) {
        if (request.type === 'ss_unlock_user_input') {

          /**
           * Call the verifyfunction, this function will verify if the provided password/userKey is correct.
           * If it's correct the first callback will be called, if it isn't correct the second callback will be called.
           */
          verifyFunc(request.data.password, function (key) {
            // we're done here, cleanup and remove the window
            browser.runtime.onMessage.removeListener(_func);
            browser.windows.onRemoved.removeListener(onRemoved);
            browser.windows.remove(newWindow.id);
            resolve(key);
          }, function (reason) {
            // show an alert to the user
            browser.tabs.sendMessage(sender.tab.id, {'type': 'ss_unlock_reject', 'msg': reason});
          });
        } else if (request.type === 'ss_unlock_cancel') {
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
  if (notificationId === 'secure-storage-cancelled') {
    browser.runtime.openOptionsPage();
  }
});
