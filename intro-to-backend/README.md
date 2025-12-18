# Express.js API Project

A Node.js API built with Express.js framework.

## Project Structure

```
intro-to-backend/
├── controllers/        # Request handlers
├── routes/            # API routes
├── .env              # Environment variables
├── .gitignore        # Git ignore file
├── package.json      # Dependencies and scripts
├── server.js         # Main application file
└── README.md         # Project documentation
```

## Installation

1. Install dependencies:
```bash
npm install
```

## Running the Application

### Development mode (with auto-reload):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### Root
- `GET /` - Welcome message

### Example Routes
- `GET /api/example` - Get example data
- `POST /api/example` - Create example data

## Environment Variables

Create a `.env` file in the root directory:

```
PORT=3000
NODE_ENV=development
```

## Technologies Used

- **Express.js** - Web framework
- **dotenv** - Environment variable management
- **cors** - Cross-origin resource sharing
- **nodemon** - Development auto-reload

## Next Steps

1. Add more routes in the `routes/` directory
2. Create additional controllers in the `controllers/` directory
3. Add database integration (MongoDB, PostgreSQL, etc.)
4. Implement authentication and authorization
5. Add input validation middleware
6. Set up logging
7. Add unit tests
