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

const generateButtonRow = function (name, login) {
  const div = document.createElement('div');
  div.classList.add('password-container');

  const button = document.createElement('button');
  button.classList.add('password-choose-btn');
  button.innerText = `${login} (${name})`;

  div.appendChild(button);

  return div;
};

window.addEventListener('DOMContentLoaded', function () {
  browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type === 'select_mul_pass_data') {
      const length = request.data.possibleCredentials.length;
      const passwordsEl = document.getElementById('passwords');

      // clear previous entries
      while (passwordsEl.hasChildNodes()) {
        passwordsEl.removeChild(passwordsEl.lastChild);
      }

      for (let i = 0; i < length; i++) {
        const el = generateButtonRow(request.data.possibleCredentials[i].Name, request.data.possibleCredentials[i].Login);
        el.addEventListener('click', function () {
          browser.runtime.sendMessage({
            'type': 'select_mul_pass_user_input',
            'data': {'selected': i}
          });
        }, false);
        passwordsEl.appendChild(el);
      }

    }
  });
});

document.getElementById('cancel').onclick = function () {
  browser.runtime.sendMessage({
    'type': 'select_mul_pass_cancel',
    'data': {}
  });
};
