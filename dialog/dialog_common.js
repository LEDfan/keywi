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

window.addEventListener('DOMContentLoaded', function () {
  for (const e of document.body.parentElement.querySelectorAll('[data-i18n]')) {
    if (e.dataset.i18n.indexOf('.') >= 0) { // attr.key: replace given attribute with i18n of key
      const spl = e.dataset.i18n.split('.');
      e.setAttribute(spl[0], browser.i18n.getMessage(spl[1]));
    } else { // Replace the content of the element
      e.innerText = browser.i18n.getMessage(e.dataset.i18n);
    }
  }

  /*
   * Fix for Fx57 bug where bundled page loaded using
   * browser.windows.create won't show contents unless resized.
   * See https://bugzilla.mozilla.org/show_bug.cgi?id=1402110
   */
  browser.windows.getCurrent(win => {
    browser.windows.update(win.id, {'width': win.width + 1});
  });
});

document.addEventListener('keyup', function (ev) {
  if (ev.key === 'Escape' || ev.key === 'Cancel') {
    document.getElementById('cancel').click();
  }
});
