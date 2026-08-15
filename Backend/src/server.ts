import express, { Express } from "express";
const app = express();
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import bodyParser from "body-parser";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUI from "swagger-ui-express";
import file_routes from "./routes/file_routes";
import auth_routes from "./routes/auth_routes";
import comments_routes from "./routes/comments_routes";
import posts_routes from "./routes/posts_routes";
import health_routes from "./routes/health_routes";
import user_routes from "./routes/user_routes";
import category_routes from "./routes/category_routes";
import business_routes from "./routes/business_routes";
import service_routes from "./routes/service_routes";
import media_routes from "./routes/media_routes";
import appointment_routes from "./routes/appointment_routes";
import review_routes from "./routes/review_routes";
import admin_routes from "./routes/admin_routes";
import notFoundMiddleware from "./middleware/not_found_middleware";
import errorMiddleware from "./middleware/error_middleware";


// 1. Core middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

// 2. Public static assets
app.use("/public/", express.static("public"));
app.use("/storage/", express.static("storage"));

// 3. Health route
app.use("/health", health_routes);

// 4. API routes
app.use("/posts", posts_routes);
app.use("/comments", comments_routes);
app.use("/auth", auth_routes);
app.use("/users", user_routes);
app.use("/categories", category_routes);
app.use("/businesses", business_routes);
app.use("/services", service_routes);
app.use("/media", media_routes);
app.use("/appointments", appointment_routes);
app.use("/reviews", review_routes);
app.use("/admin", admin_routes);
app.use("/file/", file_routes);

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Web Dev 2025 REST API",
      version: "1.0.0",
      description: "REST server including authentication using JWT",
    },
    servers: [{ url: "http://localhost:3000", },],
  },
  apis: ["./src/routes/*.ts"],
};
const specs = swaggerJsDoc(options);
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs));

// 5. Not-found middleware (after all routes)
app.use(notFoundMiddleware);

// 6. Global error middleware (must be last)
app.use(errorMiddleware);


const initApp = (): Promise<Express> => {
  return new Promise<Express>((resolve, reject) => {
    const db = mongoose.connection;
    db.on("error", console.error.bind(console, "connection error:"));
    db.once("open", function () {
      console.log("Connected to the database");
    });
    if (!process.env.DB_CONNECT) {
      reject("DB_CONNECT is not defined");
    } else {
      mongoose
        .connect(process.env.DB_CONNECT)
        .then(() => {
          resolve(app);
        })
        .catch((err) => {
          reject(err);
        });
    }
  });
};

export default initApp;