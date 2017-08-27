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

window.addEventListener("DOMContentLoaded", function() {
    for (let e of document.body.parentElement.querySelectorAll("[data-i18n]")) {
        if (e.dataset.i18n.indexOf(".") >= 0) { // attr.key: replace given attribute with i18n of key
            let spl = e.dataset.i18n.split(".");
            e.setAttribute(spl[0], browser.i18n.getMessage(spl[1]));
        } else { // Replace the content of the element
            e.innerHTML = browser.i18n.getMessage(e.dataset.i18n);
        }
    }
});

document.addEventListener('keyup', function(ev) {
  if (ev.key === 'Escape' || ev.key === 'Cancel') {
    document.getElementById('cancel').click();
    document.getElementById('cancel').click();
  }
});
