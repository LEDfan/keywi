.PHONY: run lint
run:
	web-ext run --no-reload

lint:
	./node_modules/.bin/eslint .


