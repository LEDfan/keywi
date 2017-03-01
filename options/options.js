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

window.addEventListener("DOMContentLoaded", function(){
    var inputs = document.querySelectorAll("#options input");
    for (var input of inputs) {
        (function(input) {
            browser.storage.local.get(input.name).then(function(val){
                input.value = val[input.name] || "";
                if (input.type === "checkbox") {
                    input.checked = Number.parseInt(val[input.name] || "0");
                }
            });
        })(input);
        input.addEventListener("change", debounce(function() {
            var opt = {};
            opt[this.name] = this.value;
            if (this.type === "checkbox") {
                opt[this.name] = this.checked | 0;
            }
            browser.storage.local.set(opt);
        }, 1000));
    }

    readAndUpdateUserInfo();

    document.getElementById("btn-re-encrypt").addEventListener("click", function(){
        browser.runtime.sendMessage({"type": "re-encrypt_local_secure_storage"})
            .then(function() {
                readAndUpdateUserInfo();
            });
    });

    document.getElementById("btn-reset").addEventListener("click", function(){
        if (window.userInfoData !== null && typeof window.userInfoData["Keepass database id"] !== "undefined") {
            // when the secure storage is locked we can't show the id.
            alert("To completely disconnect keepass, you will have to remove the key with id \"" + window.userInfoData["Keepass database id"] + "\" in Keepass!");
        }
        browser.runtime.sendMessage({"type": "reset"})
            .then(function() {
                readAndUpdateUserInfo();
            });
    });
});

window.userInfoData = null;

function readAndUpdateUserInfo() {
    browser.runtime.sendMessage({
        "type": "options_user_info"
    }).then(function(data) {
        window.userInfoData = data;
        let table = document.getElementById("user_info");
        const length = table.rows.length;
        for (let i = 0; i < length; i++) {
            table.deleteRow(0);
        }
        for (let key of Object.keys(data)) {
            var row = table.insertRow(table.rows.length);
            row.insertCell(0).innerText = key;
            row.insertCell(1).innerText = data[key];
        }
    });

}
