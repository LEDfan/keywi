IGNORED_FILES=ci Makefile crowdin.yml
.PHONY: run run-chromium lint release-ss deps

run:
	./node_modules/.bin/web-ext run --no-reload

run-chromium:
	./node_modules/.bin/web-ext run --no-reload -t chromium

lint:
	./node_modules/.bin/eslint . || true
	./node_modules/.bin/web-ext lint || true

# release self signed/distributed version
release-ss:
    ifndef API_KEY
		echo "API_KEY is not set"
		false
    endif
    ifndef API_SECRET
		echo "API_SECRET is not set"
		false
    endif
	sed -i 's/keywi-ff-add-on@ledfan.be/keywi-ff-add-on-ss@ledfan.be/g' manifest.json
	./node_modules/.bin/web-ext sign --ignore-files $(IGNORED_FILES) --api-key ${API_KEY} --api-secret ${API_SECRET}
	sed -i 's/keywi-ff-add-on-ss@ledfan.be/keywi-ff-add-on@ledfan.be/g' manifest.json

build:
	./node_modules/.bin/web-ext build --ignore-files ${IGNORED_FILES}

deps:
	npm install
	cp node_modules/webextension-polyfill/dist/browser-polyfill.js vendor/browser-polyfill.js
	cp node_modules/tweetnacl/nacl-fast.js vendor/nacl.js
	cp node_modules/tweetnacl-util/nacl-util.js vendor/nacl-util.js

