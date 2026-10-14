const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config();

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'User Management API',
      version: '1.0.0',
      description: 'Mobile users CRUD + JWT auth + role-based access.',
    },
    servers: [
      { url: `http://localhost:${process.env.PORT || 3000}`, description: 'Local dev' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id:       { type: 'integer', example: 1 },
            name:     { type: 'string',  example: 'Ali' },
            username: { type: 'string',  example: 'ali' },
            email:    { type: 'string',  example: 'ali@test.com' },
            role:     { type: 'string',  enum: ['user', 'admin'], example: 'user' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user:  { $ref: '#/components/schemas/User' },
            token: { type: 'string', example: 'eyJhbGciOiJI...' },
          },
        },
        Error: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        ValidationError: {
          type: 'object',
          properties: {
            error:  { type: 'string', example: 'Validation failed' },
            issues: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field:   { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],  // where to look for JSDoc annotations
};

module.exports = swaggerJsdoc(options);