.PHONY: run lint release-ss

run:
	web-ext run --no-reload

lint:
	./node_modules/.bin/eslint .

# release self signed/distributed version
release-ss:
    ifndef API_KEY
		echo "API_KEY is not set"
		exit
    endif
    ifndef API_SECRET
		echo "API_SECRET is not set"
		exit
    endif
	sed -i 's/keywi-ff-add-on@ledfan.be/keywi-ff-add-on-ss@ledfan.be/g' manifest.json
	web-ext sign --api-key ${API_KEY} --api-secret ${API_SECRET}
	sed -i 's/keywi-ff-add-on-ss@ledfan.be/keywi-ff-add-on@ledfan.be/g' manifest.json


