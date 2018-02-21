/**
 * @copyright (C) 2017 Tobia De Koninck
 * @copyright (C) 2017 Robin Jadoul
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

function SecureStorage () {
}

SecureStorage.prototype.cache = {};

SecureStorage.prototype._hasCache = function (key) {
  if (typeof this.cache[key] === 'undefined') {
    return false;
  }
  return true;
};

SecureStorage.prototype._setCache = function (key, value) {
  this.cache[key] = value;
};

SecureStorage.prototype._getCache = function (key) {
  return this.cache[key];
};

SecureStorage.prototype._removeCache = function (key) {
  delete this.cache[key];
};

SecureStorage.prototype.set = function (key, value, cache = true) {};
SecureStorage.prototype.has = function (key) {};
SecureStorage.prototype.get = function (key, cache = true) {};
SecureStorage.prototype.delete = function (key) {};
SecureStorage.prototype.clear = function () {};
SecureStorage.prototype.constructor = SecureStorage;


