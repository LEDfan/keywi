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

function init () {
  // browser.storage.local.clear(); // uncomment this to test the mechanism to ask the user for a new ke
  browser.storage.local.get('defer_unlock_ss').then(function (storage) {
    const unlock = !Number.parseInt(storage.defer_unlock_ss || '0', 10);
    new LocalSecureStorage(unlock).then(function (ss) {
      Keepass.setSecureStorage(ss);
      console.log('Initialized the Secure Storage, associating with keepass now.');
      if (unlock) {
        Keepass.reCheckAssociated().then(function (associated) {
          if (!associated) {
            Keepass._ss.has('database.key').then(function () {
              browser.notifications.create({
                'type': 'basic',
                'message': browser.i18n.getMessage('otherDBOpen'),
                'iconUrl': browser.extension.getURL('icons/keywi-96.png'),
                'title': 'Keywi'
              });
            }).
              catch(function () {
                Keepass.associate(function () {
                  console.log('Associated! 1');
                });
              });
          } else {
            console.log('Associated! 2');
          }
        });
      }
    }).
      catch(function (ss) {
        console.log('Failed to initialize Secure Storage, not associating with keepass!');
        browser.notifications.create({
          'type': 'basic',
          'message': browser.i18n.getMessage('initSSFailed'),
          'iconUrl': browser.extension.getURL('icons/keywi-96.png'),
          'title': 'Keywi'
        });
        Keepass.setSecureStorage(ss);
      });
  });
}

setTimeout(init, 1000);
