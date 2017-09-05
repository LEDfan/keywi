.PHONY: run lint release-ss deps

run:
	web-ext run --no-reload

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
	web-ext sign --ignore-files Makefile sync_translation.py --api-key ${API_KEY} --api-secret ${API_SECRET}
	sed -i 's/keywi-ff-add-on-ss@ledfan.be/keywi-ff-add-on@ledfan.be/g' manifest.json

build:
	web-ext build --ignore-files Makefile sync_translation.py

deps:
	npm install eslint web-ext

