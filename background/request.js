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

function request (req) {
  return browser.storage.local.get('keepass-server-url').then(function (pref) {
    return fetch(
      pref['keepass-server-url'] || 'http://localhost:19455',
      {
        'method': 'POST',
        'body': JSON.stringify(req),
        'headers': new Headers({'Content-Type': 'application/json'})
      }
    ).
      then(function (res) {
        return res.json();
      });
  });
}
