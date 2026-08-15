import request from "supertest";
import initApp from "../server";
import mongoose from "mongoose";
import { Express } from "express";
import userModel from "../models/user_model";
import categoryModel from "../models/category_model";
import bcrypt from "bcrypt";

let app: Express;

// Same reasoning as businesses.test.ts/services.test.ts/media.test.ts -
// bcrypt hashing plus multiple network round trips can exceed the default 5s.
jest.setTimeout(30000);

const adminUser = {
  name: "Category Admin",
  email: "category_admin_test@gmail.com",
  password: "123456",
};
const customerUser = {
  name: "Category Customer",
  email: "category_customer_test@gmail.com",
  password: "123456",
};
const businessOwnerUser = {
  name: "Category Business Owner",
  email: "category_owner_test@gmail.com",
  password: "123456",
};

let adminToken: string;
let customerToken: string;
let businessOwnerToken: string;

beforeAll(async () => {
  app = await initApp();

  await userModel.deleteMany({ email: { $in: [adminUser.email, customerUser.email, businessOwnerUser.email] } });
  await categoryModel.deleteMany({
    name: { $in: ["Nails Test", "Nails Test Updated", "Hair Test", "Duplicate Test"] },
  });

  const hashedPassword = await bcrypt.hash(adminUser.password, await bcrypt.genSalt(10));
  await userModel.create({
    name: adminUser.name,
    email: adminUser.email,
    password: hashedPassword,
    role: "admin",
  });
  const adminLogin = await request(app).post("/auth/login").send({
    email: adminUser.email,
    password: adminUser.password,
  });
  adminToken = adminLogin.body.accessToken;

  await request(app).post("/auth/register").send(customerUser);
  const customerLogin = await request(app).post("/auth/login").send({
    email: customerUser.email,
    password: customerUser.password,
  });
  customerToken = customerLogin.body.accessToken;

  await userModel.create({
    name: businessOwnerUser.name,
    email: businessOwnerUser.email,
    password: hashedPassword,
    role: "businessOwner",
  });
  const businessOwnerLogin = await request(app).post("/auth/login").send({
    email: businessOwnerUser.email,
    password: businessOwnerUser.password,
  });
  businessOwnerToken = businessOwnerLogin.body.accessToken;
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Category Tests", () => {
  let categoryId: string;

  test("Admin can create a category", async () => {
    const response = await request(app).post("/categories")
      .set("authorization", "JWT " + adminToken)
      .send({ name: "Nails Test" });
    expect(response.statusCode).toBe(201);
    expect(response.body.data.slug).toBe("nails-test");
    expect(response.body.data.isActive).toBe(true);
    categoryId = response.body.data._id;
  });

  test("Customer cannot create a category", async () => {
    const response = await request(app).post("/categories")
      .set("authorization", "JWT " + customerToken)
      .send({ name: "Hair Test" });
    expect(response.statusCode).toBe(403);
  });

  test("Public GET returns active categories", async () => {
    const response = await request(app).get("/categories");
    expect(response.statusCode).toBe(200);
    const names = response.body.data.map((c: { name: string }) => c.name);
    expect(names).toContain("Nails Test");
  });

  test("Admin can update a category and slug regenerates", async () => {
    const response = await request(app).put(`/categories/${categoryId}`)
      .set("authorization", "JWT " + adminToken)
      .send({ name: "Nails Test Updated" });
    expect(response.statusCode).toBe(200);
    expect(response.body.data.name).toBe("Nails Test Updated");
    expect(response.body.data.slug).toBe("nails-test-updated");
  });

  test("Customer cannot update a category", async () => {
    const response = await request(app).put(`/categories/${categoryId}`)
      .set("authorization", "JWT " + customerToken)
      .send({ name: "Hacked Name" });
    expect(response.statusCode).toBe(403);
  });

  test("Customer cannot deactivate a category", async () => {
    const response = await request(app).delete(`/categories/${categoryId}`)
      .set("authorization", "JWT " + customerToken);
    expect(response.statusCode).toBe(403);
  });

  test("Admin can soft-deactivate a category", async () => {
    const response = await request(app).delete(`/categories/${categoryId}`)
      .set("authorization", "JWT " + adminToken);
    expect(response.statusCode).toBe(200);
    expect(response.body.data.isActive).toBe(false);

    // Confirm it still exists in the database - soft delete, not hard delete.
    const stillExists = await categoryModel.findById(categoryId);
    expect(stillExists).not.toBeNull();
  });

  test("Inactive categories are excluded from the public list", async () => {
    const response = await request(app).get("/categories");
    const names = response.body.data.map((c: { name: string }) => c.name);
    expect(names).not.toContain("Nails Test Updated");
  });

  test("Duplicate category name is handled safely", async () => {
    await request(app).post("/categories")
      .set("authorization", "JWT " + adminToken)
      .send({ name: "Duplicate Test" });

    const response = await request(app).post("/categories")
      .set("authorization", "JWT " + adminToken)
      .send({ name: "Duplicate Test" });
    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

describe("Category Admin Visibility and Reactivation Tests", () => {
  // "Nails Test Updated" is already deactivated by the end of the describe
  // block above - reused here as the known-inactive fixture.
  test("Guest sees active categories only", async () => {
    const response = await request(app).get("/categories");
    const names = response.body.data.map((c: { name: string }) => c.name);
    expect(names).not.toContain("Nails Test Updated");
  });

  test("Customer sees active categories only", async () => {
    const response = await request(app).get("/categories").set("authorization", "JWT " + customerToken);
    const names = response.body.data.map((c: { name: string }) => c.name);
    expect(names).not.toContain("Nails Test Updated");
  });

  test("businessOwner sees active categories only", async () => {
    const response = await request(app).get("/categories").set("authorization", "JWT " + businessOwnerToken);
    const names = response.body.data.map((c: { name: string }) => c.name);
    expect(names).not.toContain("Nails Test Updated");
  });

  test("Admin sees active and inactive categories", async () => {
    const response = await request(app).get("/categories").set("authorization", "JWT " + adminToken);
    const names = response.body.data.map((c: { name: string }) => c.name);
    expect(names).toContain("Nails Test Updated");
  });

  test("Non-admin cannot reactivate an inactive category", async () => {
    const inactive = await categoryModel.findOne({ name: "Nails Test Updated" });
    const response = await request(app).put(`/categories/${inactive!._id}`)
      .set("authorization", "JWT " + customerToken)
      .send({ isActive: true });
    expect(response.statusCode).toBe(403);
  });

  test("Admin can reactivate an inactive category", async () => {
    const inactive = await categoryModel.findOne({ name: "Nails Test Updated" });
    const response = await request(app).put(`/categories/${inactive!._id}`)
      .set("authorization", "JWT " + adminToken)
      .send({ isActive: true });
    expect(response.statusCode).toBe(200);
    expect(response.body.data.isActive).toBe(true);
  });

  test("Reactivated category reappears in the public list", async () => {
    const response = await request(app).get("/categories");
    const names = response.body.data.map((c: { name: string }) => c.name);
    expect(names).toContain("Nails Test Updated");
  });

  test("Existing public category behavior is unchanged (no token required)", async () => {
    const response = await request(app).get("/categories");
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
