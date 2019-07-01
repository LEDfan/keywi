/**
 * @copyright (C) 2017-2018 Tobia De Koninck
 * @copyright (C) 2017-2018 Robin Jadoul
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

browser.contextMenus.create({
  'id': 'username-and-password',
  'title': browser.i18n.getMessage('contextFillUserPass'),
  'contexts': ['editable']
});
browser.contextMenus.create({
  'id': 'username',
  'title': browser.i18n.getMessage('contextFillUser'),
  'contexts': ['editable']
});

(async () => { // wrap in async because we have to use await
               // console.log("Contextmenu....");
  let ctx;
  if (await isChrome()) {
    // Chrome
    ctx = 'editable';
  } else {
    // Firefox
    ctx = 'password';
  }

  browser.contextMenus.create({
    'id': 'password',
    'title': browser.i18n.getMessage('contextFillPass'),
    'contexts': [ctx]
  });

})();


activeGetLogins = [];

browser.runtime.onMessage.addListener((request, sender, sendresponse) => {
  if (request.type === 'no-password-field-found') {
    browser.notifications.create({
      'type': 'basic',
      'message': browser.i18n.getMessage('noPassFieldFound'),
      'iconUrl': browser.extension.getURL('/icons/keywi-96.png'),
      'title': 'Keywi'
    });
  }
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  let type;
  if (info.menuItemId === 'username-and-password' || info.menuItemId === 'username' || info.menuItemId === 'password') {
    type = info.menuItemId;
  } else {
    return;
  }
  if (activeGetLogins.indexOf(tab.id) === -1) {
    // prevent from simultaneous filling in the credentials
    activeGetLogins.push(tab.id);
    Keywi.getGUILogins(tab.url).then(entry => {
      browser.tabs.sendMessage(tab.id, {
        'type': type,
        'username': entry.Login,
        'password': entry.Password
      });
      activeGetLogins.splice(activeGetLogins.indexOf(tab.id), 1);
    }, function() {
      activeGetLogins.splice(activeGetLogins.indexOf(tab.id), 1);
    });
  }
});
