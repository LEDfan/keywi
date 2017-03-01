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

function init() {
    // browser.storage.local.clear(); // uncomment this to test the mechanism to ask the user for a new key
    browser.storage.local.get("defer_unlock_ss").then(function(storage) {
        if (!Number.parseInt(storage["defer_unlock_ss"] || "0")) {
            new LocalSecureStorage().then(function(ss) {
                Keepass.setSecureStorage(ss);
                console.log("Initialized the Secure Storage, associating with keepass now.");
                Keepass.reCheckAssociated().then(function(associated) {
                    if (!associated) {
                        Keepass._ss.has("database.key").then(function(key) {
                            browser.notifications.create({
                                type: "basic",
                                message: "Keywi is already associated with a database, but another database is open.",
                                iconUrl: browser.extension.getURL("icons/keywi-96.png"),
                                title: "Keywi"
                            });
                        }).catch(function() {
                            Keepass.associate(function() {
                                console.log("Associated! 1");
                            });
                        });
                    } else {
                        console.log("Associated! 2");
                    }
                });
            }).catch(function(ss) {
                console.log("Failed to initialize Secure Storage, not associating with keepass!");
                Keepass.setSecureStorage(ss);
            });
            // Keepass.reCheckAssociated().then(function(associated) {
            //     if (!associated) {
                // }
            // });
        }
    });
}

setTimeout(init, 1000);
// init();
