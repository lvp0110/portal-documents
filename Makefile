.PHONY: help install build lint clean deploy-bootstrap deploy-frontend deploy-status deploy-logs

.DEFAULT_GOAL := help

help: ## Показать список команд
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Установить зависимости
	npm ci

build: ## Собрать production frontend
	npm run build

lint: ## Запустить проверку кода
	npm run lint

clean: ## Удалить локальные артефакты
	rm -rf dist

deploy-bootstrap: ## Первый checkout и запуск на prodfront
	bash deploy/bootstrap.sh

deploy-frontend: ## Выложить frontend; REV=<sha|remote-branch>
	bash deploy/deploy-frontend.sh

deploy-status: ## Проверить контейнер и публичный /__health
	bash deploy/deploy-status.sh

deploy-logs: ## Production-логи; TAIL=200 FOLLOW=1
	bash deploy/deploy-logs.sh
