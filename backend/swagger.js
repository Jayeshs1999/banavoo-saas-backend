import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Dormitory Management API",
      version: "1.0.0",
      description:
        'API for managing PG/Dormitory accommodations\n\n## Authentication\n\nAll PG routes require admin authentication. To test APIs:\n\n1. First register or login via `/api/admins/register` or `/api/admins/auth`\n2. Copy the JWT token from the response\n3. Click "Authorize" button in top right corner\n4. Enter: `Bearer your_token_here`\n5. Now you can test all PG endpoints\n\n## Important Notes\n- Admin registration creates a new admin account\n- Admin login returns a JWT token for authentication\n- All PG operations require valid admin JWT token\n- Tokens are valid for 30 days',
      contact: {
        name: "API Support",
        email: "support@example.com",
      },
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Development server",
      },
      {
        url: "https://dormitory-backend-5rda.onrender.com",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "JWT token required for all PG operations. Get token by registering or logging in as admin first.",
        },
      },
      schemas: {
        AdminRegistration: {
          type: "object",
          required: [
            "pgName",
            "ownerName",
            "email",
            "mobile",
            "password",
            "address",
          ],
          properties: {
            pgName: {
              type: "string",
              description: "Name of the PG/Dormitory",
              example: "Sample PG",
            },
            ownerName: {
              type: "string",
              description: "Name of the PG owner",
              example: "John Doe",
            },
            email: {
              type: "string",
              format: "email",
              description: "Admin email address",
              example: "admin@example.com",
            },
            mobile: {
              type: "string",
              description: "Admin mobile number",
              example: "1234567890",
            },
            password: {
              type: "string",
              minLength: 6,
              description: "Admin password",
              example: "password123",
            },
            address: {
              type: "object",
              properties: {
                area: {
                  type: "string",
                  example: "Downtown",
                },
                landmark: {
                  type: "string",
                  example: "Near Station",
                },
                city: {
                  type: "string",
                  example: "Mumbai",
                },
                pincode: {
                  type: "string",
                  example: "400001",
                },
                state: {
                  type: "string",
                  example: "Maharashtra",
                },
              },
            },
          },
        },
        AdminLogin: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "Admin email address",
              example: "admin@example.com",
            },
            password: {
              type: "string",
              minLength: 6,
              description: "Admin password",
              example: "password123",
            },
          },
        },
        PG: {
          type: "object",
          required: ["name", "structure", "location"],
          properties: {
            name: {
              type: "string",
              description: "Name of the PG",
              example: "Sample PG",
            },
            photos: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Array of photo URLs",
              example: ["https://example.com/photo1.jpg"],
            },
            structure: {
              type: "array",
              items: {
                type: "object",
                required: ["id", "name", "beds", "price"],
                properties: {
                  id: {
                    type: "string",
                    example: "room1",
                  },
                  name: {
                    type: "string",
                    description: "Room name",
                    example: "Deluxe Room",
                  },
                  beds: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["id", "price"],
                      properties: {
                        id: {
                          type: "string",
                          example: "bed1",
                        },
                        allocated: {
                          type: "boolean",
                          default: false,
                          example: false,
                        },
                        price: {
                          type: "number",
                          minimum: 0,
                          example: 5000,
                        },
                      },
                    },
                  },
                  price: {
                    type: "number",
                    minimum: 0,
                    example: 8000,
                  },
                  pricingPeriod: {
                    type: "string",
                    enum: ["day", "month"],
                    default: "month",
                    example: "month",
                  },
                },
              },
            },
            onlinePayment: {
              type: "boolean",
              default: false,
              description: "Whether online payment is available",
              example: true,
            },
            location: {
              type: "object",
              required: ["subcity", "city", "state", "country"],
              properties: {
                subcity: {
                  type: "string",
                  example: "Downtown",
                },
                city: {
                  type: "string",
                  example: "Mumbai",
                },
                state: {
                  type: "string",
                  example: "Maharashtra",
                },
                country: {
                  type: "string",
                  default: "India",
                  example: "India",
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ["./backend/routes/*.js"],
};

const specs = swaggerJsdoc(options);

export default specs;
