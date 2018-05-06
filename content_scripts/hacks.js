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

/**
 * Dirty hacks for sites that won't cooperate
 * Looking at you, microsoft
 * see https://github.com/LEDfan/keywi/issues/80
 * see https://github.com/LEDfan/keywi/issues/96
 * see https://github.com/LEDfan/keywi/pull/81
 * see https://github.com/LEDfan/keywi/pull/83
 * see https://github.com/LEDfan/keywi/pull/84
 */
function applyHacks() {
  var url = browser.extension.getURL('/content_scripts/hacks.json')
  window.fetch(url).
    then((resp) => resp.json()).
    then((hacks) => {
      Object.keys(hacks).forEach((pat) => {
        if (window.location.href.search(new RegExp(pat)) !== -1) {
          for (const el of document.querySelectorAll(hacks[pat])) {
            el.style['pointer-events'] = 'none';
          }
        }
      });
    });
}

// applyHacks();

/**
 * For dynamically added elements
 */
// document.addEventListener('contextmenu', applyHacks, true);
