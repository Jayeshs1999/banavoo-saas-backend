import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "BookShop API",
      version: "1.0.0",
      description: "A comprehensive API for managing an online book store",
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Development server",
      },
      {
        url: "https://dormitory-backend-5rda.onrender.com",
        description: "Production server (update with your actual Render URL)",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Product: {
          type: "object",
          required: [
            "name",
            "price",
            "description",
            "image",
            "brand",
            "category",
            "countInStock",
          ],
          properties: {
            _id: {
              type: "string",
              description: "Product ID",
              example: "64f1234567890abcdef12345",
            },
            name: {
              type: "string",
              description: "Product name",
              example: "The Great Gatsby",
            },
            price: {
              type: "number",
              description: "Product price",
              example: 19.99,
            },
            description: {
              type: "string",
              description: "Product description",
              example: "A classic American novel by F. Scott Fitzgerald",
            },
            image: {
              type: "string",
              description: "Product image URL",
              example: "/uploads/sample.jpg",
            },
            brand: {
              type: "string",
              description: "Product brand/author",
              example: "F. Scott Fitzgerald",
            },
            category: {
              type: "string",
              description: "Product category",
              example: "Fiction",
            },
            countInStock: {
              type: "number",
              description: "Number of items in stock",
              example: 50,
            },
            rating: {
              type: "number",
              description: "Average rating",
              example: 4.5,
            },
            numReviews: {
              type: "number",
              description: "Number of reviews",
              example: 120,
            },
            reviews: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Review",
              },
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Creation date",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update date",
            },
          },
        },
        Review: {
          type: "object",
          required: ["rating", "comment", "user"],
          properties: {
            _id: {
              type: "string",
              example: "64f1234567890abcdef12346",
            },
            rating: {
              type: "number",
              minimum: 1,
              maximum: 5,
              example: 4,
            },
            comment: {
              type: "string",
              example: "Great book, highly recommended!",
            },
            user: {
              type: "string",
              example: "64f1234567890abcdef12347",
            },
            name: {
              type: "string",
              example: "John Doe",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        User: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            _id: {
              type: "string",
              description: "User ID",
              example: "64f1234567890abcdef12348",
            },
            name: {
              type: "string",
              description: "User full name",
              example: "John Doe",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
              example: "john@example.com",
            },
            isAdmin: {
              type: "boolean",
              description: "Whether user is admin",
              example: false,
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Order: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "64f1234567890abcdef12349",
            },
            orderItems: {
              type: "array",
              items: {
                $ref: "#/components/schemas/OrderItem",
              },
            },
            user: {
              type: "string",
              example: "64f1234567890abcdef12348",
            },
            shippingAddress: {
              $ref: "#/components/schemas/ShippingAddress",
            },
            paymentMethod: {
              type: "string",
              example: "PayPal",
            },
            itemsPrice: {
              type: "number",
              example: 99.99,
            },
            taxPrice: {
              type: "number",
              example: 8.99,
            },
            shippingPrice: {
              type: "number",
              example: 10.0,
            },
            totalPrice: {
              type: "number",
              example: 118.98,
            },
            isPaid: {
              type: "boolean",
              example: false,
            },
            paidAt: {
              type: "string",
              format: "date-time",
            },
            isDelivered: {
              type: "boolean",
              example: false,
            },
            deliveredAt: {
              type: "string",
              format: "date-time",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        OrderItem: {
          type: "object",
          properties: {
            name: {
              type: "string",
              example: "The Great Gatsby",
            },
            qty: {
              type: "number",
              example: 2,
            },
            price: {
              type: "number",
              example: 19.99,
            },
            product: {
              type: "string",
              example: "64f1234567890abcdef12345",
            },
          },
        },
        ShippingAddress: {
          type: "object",
          required: ["address", "city", "postalCode", "country"],
          properties: {
            address: {
              type: "string",
              example: "123 Main St",
            },
            city: {
              type: "string",
              example: "New York",
            },
            postalCode: {
              type: "string",
              example: "10001",
            },
            country: {
              type: "string",
              example: "USA",
            },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "john@example.com",
            },
            password: {
              type: "string",
              example: "password123",
            },
          },
        },
        RegisterRequest: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: {
              type: "string",
              example: "John Doe",
            },
            email: {
              type: "string",
              format: "email",
              example: "john@example.com",
            },
            password: {
              type: "string",
              example: "password123",
            },
          },
        },
        ProductReview: {
          type: "object",
          required: ["rating", "comment"],
          properties: {
            rating: {
              type: "number",
              minimum: 1,
              maximum: 5,
              example: 4,
            },
            comment: {
              type: "string",
              example: "Great book, highly recommended!",
            },
          },
        },
        UpdateUserProfile: {
          type: "object",
          properties: {
            name: {
              type: "string",
              example: "John Doe",
            },
            email: {
              type: "string",
              format: "email",
              example: "john@example.com",
            },
            password: {
              type: "string",
              example: "newpassword123",
            },
          },
        },
        UpdateUser: {
          type: "object",
          properties: {
            name: {
              type: "string",
              example: "John Doe",
            },
            email: {
              type: "string",
              format: "email",
              example: "john@example.com",
            },
            isAdmin: {
              type: "boolean",
              example: false,
            },
          },
        },
        CreateProduct: {
          type: "object",
          required: [
            "name",
            "price",
            "description",
            "image",
            "brand",
            "category",
            "countInStock",
          ],
          properties: {
            name: {
              type: "string",
              example: "The Great Gatsby",
            },
            price: {
              type: "number",
              example: 19.99,
            },
            description: {
              type: "string",
              example: "A classic American novel by F. Scott Fitzgerald",
            },
            image: {
              type: "string",
              example: "/uploads/sample.jpg",
            },
            brand: {
              type: "string",
              example: "F. Scott Fitzgerald",
            },
            category: {
              type: "string",
              example: "Fiction",
            },
            countInStock: {
              type: "number",
              example: 50,
            },
          },
        },
        UpdateProduct: {
          type: "object",
          properties: {
            name: {
              type: "string",
              example: "The Great Gatsby",
            },
            price: {
              type: "number",
              example: 19.99,
            },
            description: {
              type: "string",
              example: "A classic American novel by F. Scott Fitzgerald",
            },
            image: {
              type: "string",
              example: "/uploads/sample.jpg",
            },
            brand: {
              type: "string",
              example: "F. Scott Fitzgerald",
            },
            category: {
              type: "string",
              example: "Fiction",
            },
            countInStock: {
              type: "number",
              example: 50,
            },
          },
        },
        CreateOrder: {
          type: "object",
          required: ["orderItems", "shippingAddress", "paymentMethod"],
          properties: {
            orderItems: {
              type: "array",
              items: {
                type: "object",
                required: ["name", "qty", "price", "product"],
                properties: {
                  name: {
                    type: "string",
                    example: "The Great Gatsby",
                  },
                  qty: {
                    type: "number",
                    example: 2,
                  },
                  price: {
                    type: "number",
                    example: 19.99,
                  },
                  product: {
                    type: "string",
                    example: "64f1234567890abcdef12345",
                  },
                },
              },
            },
            shippingAddress: {
              $ref: "#/components/schemas/ShippingAddress",
            },
            paymentMethod: {
              type: "string",
              example: "PayPal",
            },
          },
        },
        PaymentResult: {
          type: "object",
          properties: {
            id: {
              type: "string",
              example: "PAYID-123456789",
            },
            status: {
              type: "string",
              example: "COMPLETED",
            },
            update_time: {
              type: "string",
              format: "date-time",
            },
            email_address: {
              type: "string",
              format: "email",
              example: "buyer@example.com",
            },
          },
        },
      },
      parameters: {
        ProductId: {
          name: "id",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
          description: "Product ID",
          example: "64f1234567890abcdef12345",
        },
        UserId: {
          name: "id",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
          description: "User ID",
          example: "64f1234567890abcdef12348",
        },
        OrderId: {
          name: "id",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
          description: "Order ID",
          example: "64f1234567890abcdef12349",
        },
        PageNumber: {
          name: "pageNumber",
          in: "query",
          required: false,
          schema: {
            type: "integer",
            minimum: 1,
          },
          description: "Page number for pagination",
          example: 1,
        },
        Keyword: {
          name: "keyword",
          in: "query",
          required: false,
          schema: {
            type: "string",
          },
          description: "Search keyword for products",
          example: "gatsby",
        },
      },
    },
  },
  apis: ["./backend/routes/*.js"],
};

const specs = swaggerJsdoc(options);

export default specs;
