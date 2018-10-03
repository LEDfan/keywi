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

class SetupNewPasswordDialog extends Dialog {

  constructor() {
    super('/dialog/setup_secure_storage.html');
    return this.open();
  }

  onMessage(request, sender) {
    if (request.type === 'ss_setup_password_user_input') {
      this.resolve(request.data.password);
      this.close();
    } else if (request.type === 'ss_setup_password_cancel') {
      this.close();
      browser.notifications.create('secure-storage-cancelled', {
        'type': 'basic',
        'iconUrl': browser.extension.getURL('/icons/keywi-96.png'),
        'title': 'Keywi',
        'message': browser.i18n.getMessage('SSsetupCancelled')
      });
      this.reject('Aborted!');
    }
  }
}

class UnlockDialog extends Dialog {

  constructor(verifyFunc) {
    super('/dialog/unlock_secure_storage.html');
    this.verifyFunc = verifyFunc;
    return this.open();
  }

  onClosedByUser() {
    browser.notifications.create('secure-storage-cancelled', {
      'type': 'basic',
      'iconUrl': browser.extension.getURL('/icons/keywi-96.png'),
      'title': 'Keywi',
      'message': browser.i18n.getMessage('SSunlockCancelled')
    });
    this.reject();
  }

  onMessage(request, sender) {
    const self = this;
    if (request.type === 'ss_unlock_user_input') {

      /**
       * Call the verifyfunction, this function will verify if the provided password/userKey is correct.
       * If it's correct the first callback will be called, if it isn't correct the second callback will be called.
       */
      this.verifyFunc(
        request.data.password,
        key => {
          // we're done here, cleanup and close the dialog
          this.close();
          self.resolve(key);
        },
        reason => {
          // show an alert to the user
          browser.tabs.sendMessage(sender.tab.id, {'type': 'ss_unlock_reject', 'msg': reason});
        }
      );
    } else if (request.type === 'ss_unlock_cancel') {
      this.close();
      this.onClosedByUser();
    }
  }
}

browser.notifications.onClicked.addListener(notificationId => {
  if (notificationId === 'secure-storage-cancelled') {
    browser.runtime.openOptionsPage();
  }
});
