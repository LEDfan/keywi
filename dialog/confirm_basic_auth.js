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
  browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type === 'confirm_basic_auth_data') {
      const host = request.data.host;
      const realm = request.data.realm;
      const pageHost = request.data.page_host;
      document.getElementById('request-url').innerText = request.data.url;
      document.getElementById('host').innerText = host;
      if (realm !== null && realm !== undefined) {
        document.getElementById('realm').innerText = realm;
        document.getElementById('realm-part').classList.remove('hidden');
      }
      if (host !== pageHost) {
        document.getElementById('request-host').innerText = pageHost;
        document.getElementById('host-warning').classList.remove('hidden');
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
