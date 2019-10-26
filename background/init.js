/**
 * @copyright (C) 2017-2018 Tobia De Koninck
 * @copyright (C) 2017-2018 Robin Jadoul
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

async function init() {
  let storage = await browser.storage.local.get('defer_unlock_ss');
  const unlock = !Number.parseInt(storage.defer_unlock_ss || '0', 10);
  // setup and unlock SecureStorage
  try {
    Keywi.setSecureStorage(await new LocalSecureStorage(unlock))
  } catch (ss) {
    // }).catch(function(ss) {
    console.log(ss);
    console.log('Failed to initialize Secure Storage, not associating with keepass!');
    browser.notifications.create({
      'type': 'basic',
      'message': browser.i18n.getMessage('initSSFailed'),
      'iconUrl': browser.extension.getURL('icons/keywi-96.png'),
      'title': 'Keywi'
    });
    Keywi.setSecureStorage(ss); // set locked/invalid SS
  }
  let backend = new KeepassXCBackend(Keywi._ss);
  if (!await backend.init()) {
    console.log("error in init of backend!");
  }
  Keywi.setBackend(backend); // even set backend if error
}

setTimeout(init, 1000);
