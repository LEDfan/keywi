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

document.forms[0].onsubmit = function (e) {
  e.preventDefault(); // Prevent submission
  const password = document.getElementById('pass').value;
  browser.runtime.sendMessage({
    'type': 'ss_unlock_user_input',
    'data': {'password': password}
  });
};

browser.runtime.onMessage.addListener(function (request) {
  // Chrome wants a response immediately therefore we make the alert async
  (async () => {
    if (request.type === 'ss_unlock_reject') {
      alert(request.msg);
    }
  })();
  return true;
});

document.getElementById('cancel').onclick = function () {
  browser.runtime.sendMessage({
    'type': 'ss_unlock_cancel',
    'data': {}
  });
};
