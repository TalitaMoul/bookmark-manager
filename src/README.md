# Bookmark Manager API

A professional REST API built for managing web bookmarks, developed with Node.js, Express, and TypeScript.

## Technologies

- **Node.js & Express**: Core API structure.
- **TypeScript**: Static typing for better maintainability.
- **Zod**: Data validation and schema definition.
- **Jest & Supertest**: Automated testing suite.
- **JSON File**: Local data persistence.

## How to Run

1. Clone the repository.
2. Install dependencies: `npm install`
3. Set up environment variables in a `.env` file (e.g., `PORT=3000`).
4. Run in development mode: `npm run dev`
5. Run tests: `npm test`

## API Endpoints

- `GET /health`: Check API status.
- `GET /bookmarks`: List all bookmarks (use `?tag=name` to filter).
- `POST /bookmarks`: Create a new bookmark.
- `PUT /bookmarks/:id`: Update an existing bookmark.
- `DELETE /bookmarks/:id`: Remove a bookmark.
