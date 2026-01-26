import path from "path";
import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import productRoutes from "./routes/productRoute.js";
import userRoute from "./routes/userRoute.js";
import orderRoute from "./routes/orderRoute.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpecs from "./swagger.js";

import cookieParser from "cookie-parser";
dotenv.config();
const port = process.env.PORT || 5000;

connectDB(); //connect to mongoDB

const app = express();

//body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// cookie parser middleware
app.use(cookieParser());

app.use("/api/products", productRoutes);
app.use("/api/users", userRoute);
app.use("/api/orders", orderRoute);
app.use("/api/upload", uploadRoutes);
app.get("/api/config/paypal", (req, res) =>
  res.send({
    clientId: process.env.PAYPAL_CLIENT_ID,
  }),
);

const __dirname = path.resolve(); //set __dirname to current directory
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

// if(process.env.NODE_ENV === 'production') {

//   //set static folder
//   app.use(express.static(path.join(__dirname, '/mybookstore/build')))

//   //any route that is not api will be redirected to index.html
//   app.get('*', (req, res)=> res.sendFile(path.resolve(__dirname, 'mybookstore', 'build', 'index.html')))

// }else {
//   app.get("/", (req, res) => {
//     res.send("API is running...");
//   });

// }

app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

// Swagger UI setup
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpecs, {
    explorer: true,
    customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin-bottom: 20px }
  `,
    customSiteTitle: "BookShop API Documentation",
    customfavIcon: "/favicon.ico",
  }),
);

app.use(notFound);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`server running on ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api-docs`);
});
