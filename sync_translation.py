#!/usr/bin/env python3
# This script synchronises a translated language file with the English one
# It will:
#  - add new keys from `en/message.json` to any other language file
#  - update descriptions from `en/messages.json` to any other language file

import os
import os.path
import json
from collections import OrderedDict

translations = {}

def synctranslation(base, target_file_name):
  added = []
  updated = []
  nottranslated = []

  with open(target_file_name) as file:
    # target = json.load(file)
    target = json.load(file, object_pairs_hook=OrderedDict)

  for id in sorted(base):
    if id not in target:
      added.append(id)
      target[id] = base[id]
    elif target[id]["description"] != base[id]["description"]:
      updated.append(id)
      target[id]["description"] = base[id]["description"]

    if target[id]["message"] == base[id]["message"]:
      nottranslated.append(id)

  with open(target_file_name, 'w') as file:
    json.dump(target, file, indent=2, ensure_ascii=False)

  return {"added": added, "updated": updated, "nottranslated": nottranslated}


if __name__ == "__main__":

  with open(os.path.join('_locales', 'en', 'messages.json')) as file:
    enTranslation = json.load(file)

  for f in os.listdir('_locales'):
    if f != "en":
      stats = synctranslation(enTranslation, os.path.join("_locales", f, "messages.json"))

      if len(stats["added"]) > 0:
        for key in stats["added"]:
          print("[" + str(f) + "] Added              " + str(key))

      if len(stats["updated"]) > 0:
        for key in stats["updated"]:
          print("[" + str(f) + "] Updated            " + str(key))

      if len(stats["nottranslated"]) > 0:
        for key in stats["nottranslated"]:
          print("[" + str(f) + "] Needs translation  " + str(key))
