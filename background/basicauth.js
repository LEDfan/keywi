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

(async () => {
  function extractHost(url) {
    // Extract host from '<protocol>://<host>/<rest>', includes the port
    return (/:\/\/([^/]+)\//).exec(url)[1];
  }

  await addOnAuthRequiredListener(details => {
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
    return new BasicAuthDialog({
      'url': details.url,
      'host': details.challenger.host,
      'realm': details.realm,
      'page_host': pageHost
    }).then(function(response) {
      if (response.code === 'fill') {
        return {'authCredentials': {'username': response.username, 'password': response.password}};
      } else if (response.code === 'cancel') {
        return {};
      }
    });
  });
})();
