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

/**
 * Dialog to enter a new password for the secure storage.
 */
class SetupNewPasswordDialog extends Dialog {

  constructor() {
    super('/dialog/setup_secure_storage.html');
    this.registerMessageHandler('ss_setup_password_user_input', this.onSetupPasswordUserInput);
    this.registerMessageHandler('ss_setup_password_cancel', this.onSetupPasswordCancel);
    return this.open();
  }

  /**
   * Called when the user submits the form with the new password.
   * @param request
   */
  onSetupPasswordUserInput(request) {
    this.resolve(request.data.password);
    this.close();
  }

  /**
   * Called when the user cancels the form.
   */
  onSetupPasswordCancel() {
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

/**
 * Dialog to enter the password for the secure storage.
 */
class UnlockDialog extends Dialog {

  constructor(verifyFunc) {
    super('/dialog/unlock_secure_storage.html');
    this.verifyFunc = verifyFunc;
    this.registerMessageHandler('ss_unlock_user_input', this.onUnlockUserInput);
    this.registerMessageHandler('ss_unlock_cancel', this.onUnlockCancel);
    return this.open();
  }

  /**
   * Called when the user submits.
   * @param request
   * @param sender
   */
  onUnlockUserInput(request, sender) {
    /**
     * Call the verifyfunction, this function will verify if the provided password/userKey is correct.
     * If it's correct the first callback will be called, if it isn't correct the second callback will be called.
     */
    this.verifyFunc(
      request.data.password,
      key => {
        // we're done here, cleanup and close the dialog
        this.close();
        this.resolve(key);
      },
      reason => {
        // show an alert to the user
        browser.tabs.sendMessage(sender.tab.id, {'type': 'ss_unlock_reject', 'msg': reason});
      }
    );
  }

  /**
   * Called when the user cancels the form.
   */
  onUnlockCancel() {
    this.close();
    browser.notifications.create('secure-storage-cancelled', {
      'type': 'basic',
      'iconUrl': browser.extension.getURL('/icons/keywi-96.png'),
      'title': 'Keywi',
      'message': browser.i18n.getMessage('SSunlockCancelled')
    });
    this.reject();
  }

}

/**
 * Dialog to select multiple passwords.
 */
class SelectCredentialsDialog extends Dialog {

  constructor(possibleCredentials) {
    super('/dialog/select_multiple_passwords.html');
    this.possibleCredentials = possibleCredentials;
    this.registerMessageHandler('select_mul_pass_user_input', this.onSelectedMultiplePasswords);
    this.registerMessageHandler('select_mul_pass_cancel', this.onCancel);
    return this.open({'type': 'select_mul_pass_data', 'data': {'possibleCredentials': possibleCredentials}});
  }

  /**
   * Called when the user selects a credential to use.
   * @param request
   */
  onSelectedMultiplePasswords(request) {
    this.close();
    this.resolve(this.possibleCredentials[request.data.selected]);
  }

  /**
   * Called when the user cancels the dialog.
   */
  onCancel() {
    this.close();
    this.reject();
  }

}


/**
 * Dialog to choose whether to use Keywi for basic auth.
 */
class BasicAuthDialog extends Dialog {

  constructor(config) {
    super('/dialog/confirm_basic_auth.html');
    this.config = config;
    this.registerMessageHandler('confirm_basic_auth_fetch', this.onConfirmedFetch);
    this.registerMessageHandler('confirm_basic_auth_select', this.onConfirmedSelect);
    this.registerMessageHandler('confirm_basic_auth_cancel', this.onCancel);
    return this.open({'type': 'confirm_basic_auth_data', 'data': config});
  }

  /**
   * Called when the user confirms they want to use Keywi for basic auth.
   */
  onConfirmedFetch() {
    return Keywi.getLoginsAndErrorHandler(this.config.url);
  }

  /**
   * Called when the user selects a credential to use for basic auth.
   * @param request
   */
  onConfirmedSelect(request) {
    this.close();
    this.resolve({'code': 'fill', 'username': request.data.selected.login, 'password': request.data.selected.password});
  }

  /**
   * Called when the user cancels the dialog, i.e. when they want to use the FF dialog.
   */
  onCancel() {
    this.close();
    this.resolve({'code': 'cancel'});
  }

}

