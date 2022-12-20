BINARY_NAME=score-board
BINARY_PATH=./dist/${BINARY_NAME}
WEB_PATH=./web
DIST_WEB=./dist-web

build: build-web build-go

build-go:
	go build -o ${BINARY_PATH} .

build-web:
	yarn --cwd ${WEB_PATH} build

dev-go:
	fiber dev .

dev-web:
	yarn --cwd ${WEB_PATH} dev

run: build
	cd ./dist && ./${BINARY_NAME}

clean:
	go clean
	rm -f ./${BINARY_PATH} && rm -rf ${DIST_WEB}
