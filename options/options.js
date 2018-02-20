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
function readAndUpdateUserInfo () {
  browser.runtime.sendMessage({'type': 'options_user_info'}).then(function (data) {
    window.userInfoData = data;
    const table = document.getElementById('user_info');
    const length = table.rows.length;
    for (let i = 0; i < length; i++) {
      table.deleteRow(0);
    }
    for (const key of Object.keys(data.table)) {
      const row = table.insertRow(table.rows.length);
      row.insertCell(0).innerText = key;
      row.insertCell(1).innerText = data.table[key];
    }

    if (data.associated === true) {
      document.getElementById('btn-associate').style.display = 'none';
    } else {
      // just to be sure when the function is called after the user updates.
      document.getElementById('btn-associate').style.display = 'block';
    }
  });
}

window.addEventListener('DOMContentLoaded', function () {
  for (const e of document.body.parentElement.querySelectorAll('[data-i18n]')) {
    if (e.dataset.i18n.indexOf('.') >= 0) { // attr.key: replace given attribute with i18n of key
      const spl = e.dataset.i18n.split('.');
      e.setAttribute(spl[0], browser.i18n.getMessage(spl[1]));
    } else { // Replace the content of the element
      e.innerText = browser.i18n.getMessage(e.dataset.i18n);
    }
  }
  const inputs = document.querySelectorAll('#options input');
  for (const input of inputs) {
    browser.storage.local.get(input.name).then(function (val) {
      input.value = val[input.name] || '';
      if (input.type === 'checkbox') {
        input.checked = Number.parseInt(val[input.name] || '0', 10);
      }
    });
    input.addEventListener('change', debounce(function () {
      const opt = {};
      opt[this.name] = this.value;
      if (this.type === 'checkbox') {
        opt[this.name] = this.checked | 0;
      }
      browser.storage.local.set(opt);
    }, 1000));
  }

  readAndUpdateUserInfo();

  document.getElementById('btn-re-encrypt').addEventListener('click', function () {
    browser.runtime.sendMessage({'type': 're-encrypt_local_secure_storage'}).
      then(function () {
        readAndUpdateUserInfo();
      });
  });

  document.getElementById('btn-reset').addEventListener('click', function () {
    if (window.userInfoData !== null && typeof window.userInfoData['Keepass database id'] !== 'undefined') {
      // when the secure storage is locked we can't show the id.
      alert(`To completely disconnect keepass, you will have to remove the key with id "${window.userInfoData['Keepass database id']}" in Keepass!`);
    }
    browser.runtime.sendMessage({'type': 'reset'}).
      then(function () {
        readAndUpdateUserInfo();
      });
  });

  document.getElementById('btn-associate').addEventListener('click', function () {
    browser.runtime.sendMessage({'type': 'associate'}).
      then(function () {
        readAndUpdateUserInfo();
      });
  });
});

window.userInfoData = null;

