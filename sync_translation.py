#!/usr/bin/env python3

# @copyright Tobia De Koninck
# @copyright Robin Jadoul
#
# This file is part of Keywi.
# Keywi is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# Keywi is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
# You should have received a copy of the GNU General Public License
# along with Keywi.  If not, see <http://www.gnu.org/licenses/>.

"""
This script synchronises a translated language file with the English one
It will:
 - add new keys from `en/message.json` to any other language file
 - update descriptions from `en/messages.json` to any other language file
"""

import os
import sys
import os.path
from os.path import join
import json
from collections import OrderedDict

translations = {}


def sync_translation(base_path, base, target_file_name):
    added = []
    updated = []
    not_translated = []

    with open(join(base_path, target_file_name)) as file:
        target = json.load(file, object_pairs_hook=OrderedDict)

    for id in sorted(base):
        if id not in target:
            added.append(id)
            target[id] = base[id]
            target[id]["message"] = "~~" + target[id]["message"]
        elif target[id]["message"][:2] == "~~":
            not_translated.append(id)
        elif target[id]["description"] != base[id]["description"]:
            updated.append(id)
            target[id]["description"] = base[id]["description"]

    with open(join(base_path, target_file_name), 'w') as file:
        json.dump(target, file, indent=2, ensure_ascii=False)

    return {"added": added, "updated": updated, "not_translated": not_translated}


if __name__ == "__main__":
    stats_only = len(sys.argv) == 2 and sys.argv[1] == "--stats-only"

    base_path = os.path.dirname(__file__)

    with open(join(base_path, '_locales', 'en', 'messages.json')) as file:
        enTranslation = json.load(file)

    total = len(enTranslation)

    for f in os.listdir(join(base_path, '_locales')):
        if f != "en":
            stats = sync_translation(base_path, enTranslation, os.path.join("_locales", f, "messages.json"))

            if not stats_only:
                for key in stats["added"]:
                    print("[" + str(f) + "] Added              " + str(key))

                for key in stats["updated"]:
                    print("[" + str(f) + "] Updated            " + str(key))

                for key in stats["not_translated"]:
                    print("[" + str(f) + "] Not Translated     " + str(key))
            else:
                 print(("[" + str(f) + "]").ljust(20, ' ') + str(total - len(stats["added"]) - len(stats["not_translated"])) + "/" + str(total))

