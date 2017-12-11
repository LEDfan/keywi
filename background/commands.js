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
 *
 * You should have received a copy of the GNU General Public License
 * along with Keywi.  If not, see <http://www.gnu.org/licenses/>.
 */

browser.commands.onCommand.addListener((cmd) => {
  let type;
  if (cmd === 'fill-form') {
    type = 'username-and-password';
  } else if (cmd === 'fill-password') {
    type = 'password';
  } else {
    return;
  }
  browser.tabs.query({'currentWindow': true, 'active': true}).then((tabs) => {
    Keepass.getLogins(tabs[0].url, (entries) => {
      browser.tabs.sendMessage(tabs[0].id, {
        'type': type,
        'suppress_error_on_missing_pw_field': true,
        'username': entries.Login,
        'password': entries.Password
      });
    });
  });
});
