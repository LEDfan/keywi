/**
 * @copyright Robin Jadoul
 *
 * Copyright (C) 2018  Robin Jadoul
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

(function() {
  function confirmationDialog(config) {
    const dialogUrl = browser.extension.getURL('dialog/confirm_basic_auth.html');
    return browser.windows.create({
      'type': 'panel',
      'width': 400,
      'height': 600,
      'url': dialogUrl,
      'incognito': true
    }).then(function (newWindow) {
      const openedWindowId = newWindow.id;

      return new Promise(function(resolve, reject) {
        browser.tabs.query({'windowId': openedWindowId}).then(function (tabs) {
          const openTabId = tabs[0].id;
          browser.tabs.onUpdated.addListener(function _sendData(tabId, changeInfo, tabInfo) {
            if (tabId === openTabId && tabInfo.status === 'complete') {
              setTimeout(function () {
                browser.tabs.sendMessage(openTabId, {
                  'type': 'confirm_basic_auth_data',
                  'data': config
                });
                browser.tabs.onUpdated.removeListener(_sendData);
              }, 300);
            }
          });
        });

        function _onRemove(winId) {
          if (openedWindowId === winId) {
            clean();
            reject();
          }
        }

        function _handler(request, sender, sendResponse) {
          if (request.type === 'confirm_basic_auth_fill') {
            clean();
            resolve('fill');
          } else if (request.type === 'confirm_basic_auth_manual') {
            clean();
            resolve('manual');
          } else if (request.type === 'confirm_basic_auth_cancel') {
            clean();
            resolve('cancel');
          }
        }

        function clean() {
          browser.runtime.onMessage.removeListener(_handler);
          browser.windows.onRemoved.removeListener(_onRemove);
          browser.windows.remove(newWindow.id);
        }

        browser.windows.onRemoved.addListener(_onRemove);
        browser.runtime.onMessage.addListener(_handler);
      });
    });
  }

  function queryDB(url) {
    return new Promise(function(resolve, reject) {
      Keepass.getLogins(url, function(entry) {
        resolve({'authCredentials': {'username': entry.Login, 'password': entry.Password}});
      }, function() {
        resolve({});
      });
    });
  }

  browser.webRequest.onAuthRequired.addListener(function(details) {
    if (details.isProxy) {
      // Don't do proxy's, at least for now
      return;
    }
    // TODO? track retries
    return browser.tabs.get(details.tabId)
      .then(function (tab) {
        // Prevent looking at the old url when the page hasn't properly loaded yet
        const pageHost = details.frameId === 0
          ? details.challenger.host
          : (/:\/\/([^/]+)\//).exec(tab.url)[1];
        return confirmationDialog({'url': details.url, 'host': details.challenger.host, 'realm': details.realm, 'page_host': pageHost});
      })
      .then(function (choice) {
        if (choice === 'fill') {
          return queryDB(details.url);
        } else if (choice === 'manual') {
          return {};
        } else if (choice === 'cancel') {
          return {'cancel': true};
        }
      });
  }, {'urls': ['<all_urls>']}, ['blocking']);
}());
