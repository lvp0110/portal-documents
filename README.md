# Портал документов

React + TypeScript приложение: загрузка PDF, сохранение оригинала, просмотр того же файла на экране и скачивание без изменений.

Сейчас хранилище локальное (IndexedDB в браузере). Тот же клиент умеет ходить во внешний API, если задан адрес.

## Запуск

```bash
npm install
npm run dev
```

Сборка: `npm run build`.

## Как пользоваться

1. Перетащите один PDF в форму или выберите его с компьютера. Если отмечен бренд, файл сохранится для бренда. Если отмечены материалы — для материалов. Если отмечены и бренд, и материалы — для обоих. Тип документа обязателен. Материалов можно отметить несколько.
2. На экране открывается выбранный PDF, страница за страницей, в том же виде, что и исходный файл.
3. Скачивание отдаёт тот файл, который сейчас открыт.
4. Слева фильтры по бренду, материалу и типу документа. Несколько отметок внутри одного списка объединяются, условия разных списков применяются вместе.

Кнопка «Добавить пример» кладёт в хранилище короткий демонстрационный PDF.

## Внешний API

Создайте `.env.local`:

```bash
VITE_DOCUMENTS_API_URL=http://localhost:8080
```

Перезапустите `npm run dev`. На экран выводится исходный PDF.

- `GET /documents` — массив документов
- `GET /documents/:id/file` — исходный файл. Для новых документов добавьте `?role=brand`, `?role=materials` или `?role=constructions`
- `POST /documents` — `multipart/form-data`: `title`, `brand`, `material` (можно несколько раз), `construction` (можно несколько раз), `documentType`, `brandFile`, `materialsFile`, `constructionsFile`, `brandPageCount`, `materialsPageCount`, `constructionsPageCount`. Нужен хотя бы один файл
- `DELETE /documents/:id`
- `GET /catalogs` — необязательно: `{ brands, materials, constructions, documentTypes }`

Поля документа: `id`, `title`, `fileName`, `mimeType`, `size`, `brand`, `materials`, `constructions`, `documentType`, `uploadedAt`, `pageCount`, `files`. Старые записи с одним полем `material` и одним файлом тоже читаются.
