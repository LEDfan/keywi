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

window.addEventListener('DOMContentLoaded', function () {
  function show(id) {
    document.getElementById(id).classList.remove('hidden');
  }
  function set(id, val) {
    document.getElementById(id).innerText = val;
  }

  browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type === 'confirm_basic_auth_data') {
      const url = request.data.url;
      const host = request.data.host;
      const realm = request.data.realm;
      const pageHost = request.data.page_host;
      set('request-url', url);
      set('host', host);
      if (realm !== null && realm !== undefined) {
        set('realm', realm);
        show('realm-part');
      }
      if (host !== pageHost) {
        set('request-host', pageHost);
        show('host-warning');
      }
      if (!url.startsWith('https://')) {
        show('ssl-warning');
      }
    }
  });
});

document.getElementById('fill').onclick = function () {
  browser.runtime.sendMessage({'type': 'confirm_basic_auth_fill'});
};

document.getElementById('cancel').onclick = function () {
  browser.runtime.sendMessage({'type': 'confirm_basic_auth_manual'});
};

document.getElementById('realcancel').onclick = function () {
  browser.runtime.sendMessage({'type': 'confirm_basic_auth_cancel'});
};
