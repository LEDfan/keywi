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

class BasicAuthDialog extends Dialog {

  constructor(config) {
    super('/dialog/confirm_basic_auth.html');
    this.config = config;
    return this.open({'type': 'confirm_basic_auth_data', 'data': 'config'});
  }

  onMessage(request, sender, sendResponse) {
    if (request.type === 'confirm_basic_auth_fetch') {
      return Keepass.getLoginsAndErrorHandler(this.config.url);
    } else if (request.type === 'confirm_basic_auth_select') {
      this.close();
      this.resolve({'code': 'fill', 'username': request.data.selected.Login, 'password': request.data.selected.Password});
    } else if (request.type === 'confirm_basic_auth_cancel') {
      this.close();
      this.resolve({'code': 'cancel'});
    }
  }
}

(function() {
  function extractHost(url) {
    // Extract host from '<protocol>://<host>/<rest>', includes the port
    return (/:\/\/([^/]+)\//).exec(url)[1];
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
      if (details.url.split('/').pop() === 'favicon.ico') {
        // Workaround for #112
        return {};
      }
      return new BasicAuthDialog({'url': details.url, 'host': details.challenger.host, 'realm': details.realm, 'page_host': pageHost}).
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
