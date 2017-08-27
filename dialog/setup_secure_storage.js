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

document.forms[0].onsubmit = function (e) {
  e.preventDefault(); // Prevent submission
  const password1 = document.getElementById('pass1').value;
  const password2 = document.getElementById('pass2').value;
  if (password1 !== password2) {
    alert('Passwords must be equal!'); // TODO
  } else {
    browser.runtime.sendMessage({
      'type': 'ss_setup_password_user_input',
      'data': {'password': password1}
    });
    // browser.windows.remove(window.windowId);
  }
};

document.getElementById('cancel').onclick = function () {
  browser.runtime.sendMessage({
    'type': 'ss_setup_password_cancel',
    'data': {}
  });
};
