# Northstar Tasks API

Fictional API documentation for demonstration only.

## Authentication

Send an API token in the Authorization header using the Bearer scheme. Never expose tokens in frontend code.

## Endpoints

- `GET /api/tasks`: List tasks.
- `GET /api/tasks/:id`: Retrieve one task.
- `POST /api/tasks`: Create a task with a required title and optional description.
- `PATCH /api/tasks/:id`: Update a task.
- `DELETE /api/tasks/:id`: Delete a task.

## Example request

```json
{"title": "Review documentation", "description": "Check API examples"}
```

## Rate limits

Clients may send 60 requests per minute. Exceeding this limit returns HTTP 429.

## Error codes

- 400: Invalid request.
- 401: Missing or invalid authentication.
- 404: Task not found.
- 429: Rate limit exceeded.
- 500: Internal server error.
