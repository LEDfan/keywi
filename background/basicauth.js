/**
 * @copyright (C) 2018 Tobia De Koninck
 * @copyright (C) 2018 Robin Jadoul
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

(function() {
  function extractHost(url) {
    // Extract host from '<protocol>://<host>/<rest>', includes the port
    return (/:\/\/([^/]+)\//).exec(url)[1];
  }

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
            clean(); // eslint-disable-line no-use-before-define
            reject();
          }
        }

        function _handler(request, sender, sendResponse) {
          if (request.type === 'confirm_basic_auth_fetch') {
            Keepass.getLoginsAndErrorHandler(config.url).then((resp) => {
              sendResponse(resp);
            }, () => {
              clean(); // eslint-disable-line no-use-before-define
              reject();
            });

            return true;
          } else if (request.type === 'confirm_basic_auth_select') {
            clean(); // eslint-disable-line no-use-before-define
            resolve({'code': 'fill', 'username': request.data.selected.Login, 'password': request.data.selected.Password});
          } else if (request.type === 'confirm_basic_auth_cancel') {
            clean(); // eslint-disable-line no-use-before-define
            resolve({'code': 'cancel'});
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

  // only supported on FF >= 54, but 52 is an ESR version
  if (typeof browser.webRequest.onAuthRequired !== 'undefined') {
    browser.webRequest.onAuthRequired.addListener(function(details) {
      if (details.isProxy) {
        // Don't do proxy's, at least for now
        return;
      }
      let pageHost;
      if (typeof details.originUrl !== 'undefined') {
        pageHost = extractHost(details.originUrl);
      } else {
        pageHost = details.challenger.host;
      }
      return confirmationDialog({'url': details.url, 'host': details.challenger.host, 'realm': details.realm, 'page_host': pageHost}).
        then(function (response) {

          if (response.code === 'fill') {
            return {'authCredentials': {'username': response.username, 'password': response.password}};
          } else if (response.code === 'cancel') {
            return {};
          }
        });
    }, {'urls': ['<all_urls>']}, ['blocking']);
  }
}());
