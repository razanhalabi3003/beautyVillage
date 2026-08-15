import request from "supertest";
import initApp from "../server";
import mongoose from "mongoose";
import { Express } from "express";
import userModel from "../models/user_model";
import categoryModel from "../models/category_model";
import businessModel from "../models/business_model";
import bcrypt from "bcrypt";

let app: Express;

jest.setTimeout(30000);

const adminUser = { name: "Admin Stats Admin", email: "admin_stats_admin_test@gmail.com", password: "123456" };
const customerUser = { name: "Admin Stats Customer", email: "admin_stats_customer_test@gmail.com", password: "123456" };
const businessOwnerUser = { name: "Admin Stats Owner", email: "admin_stats_owner_test@gmail.com", password: "123456" };
const deltaUser = { name: "Stats Delta User", email: "admin_stats_delta_user_test@gmail.com", password: "123456" };

let adminToken: string;
let customerToken: string;
let businessOwnerToken: string;
let ownerId: string;
let categoryId: string;

beforeAll(async () => {
  app = await initApp();

  await userModel.deleteMany({
    email: { $in: [adminUser.email, customerUser.email, businessOwnerUser.email, deltaUser.email] },
  });
  await categoryModel.deleteMany({ name: "Admin Stats Category" });
  await businessModel.deleteMany({ name: "Admin Stats Studio" });

  const hashedPassword = await bcrypt.hash(adminUser.password, await bcrypt.genSalt(10));

  await userModel.create({ name: adminUser.name, email: adminUser.email, password: hashedPassword, role: "admin" });
  const adminLogin = await request(app).post("/auth/login").send({ email: adminUser.email, password: adminUser.password });
  adminToken = adminLogin.body.accessToken;

  await request(app).post("/auth/register").send(customerUser);
  const customerLogin = await request(app).post("/auth/login").send({ email: customerUser.email, password: customerUser.password });
  customerToken = customerLogin.body.accessToken;

  const owner = await userModel.create({ name: businessOwnerUser.name, email: businessOwnerUser.email, password: hashedPassword, role: "businessOwner" });
  ownerId = owner._id.toString();
  const ownerLogin = await request(app).post("/auth/login").send({ email: businessOwnerUser.email, password: businessOwnerUser.password });
  businessOwnerToken = ownerLogin.body.accessToken;

  const category = await categoryModel.create({ name: "Admin Stats Category", slug: "admin-stats-category", isActive: true });
  categoryId = category._id.toString();
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("GET /admin/stats access control", () => {
  test("Customer is blocked", async () => {
    const response = await request(app).get("/admin/stats").set("authorization", "JWT " + customerToken);
    expect(response.statusCode).toBe(403);
  });

  test("businessOwner is blocked", async () => {
    const response = await request(app).get("/admin/stats").set("authorization", "JWT " + businessOwnerToken);
    expect(response.statusCode).toBe(403);
  });

  test("Unauthenticated request is blocked", async () => {
    const response = await request(app).get("/admin/stats");
    expect(response.statusCode).toBe(401);
  });

  test("Admin succeeds", async () => {
    const response = await request(app).get("/admin/stats").set("authorization", "JWT " + adminToken);
    expect(response.statusCode).toBe(200);
  });
});

describe("GET /admin/stats shape and accuracy", () => {
  test("Response includes all expected buckets", async () => {
    const response = await request(app).get("/admin/stats").set("authorization", "JWT " + adminToken);
    const { data } = response.body;
    expect(data.users).toEqual(expect.objectContaining({ total: expect.any(Number), active: expect.any(Number), inactive: expect.any(Number) }));
    expect(data.businesses).toEqual(
      expect.objectContaining({
        total: expect.any(Number),
        pending: expect.any(Number),
        approved: expect.any(Number),
        rejected: expect.any(Number),
        suspended: expect.any(Number),
      })
    );
    expect(data.appointments).toEqual(
      expect.objectContaining({
        total: expect.any(Number),
        pending: expect.any(Number),
        confirmed: expect.any(Number),
        completed: expect.any(Number),
        cancelled: expect.any(Number),
        rejected: expect.any(Number),
      })
    );
    expect(data.reviews).toEqual(expect.objectContaining({ total: expect.any(Number), visible: expect.any(Number), hidden: expect.any(Number) }));
  });

  // The shared test DB has data from every other test file, so absolute
  // counts can't be asserted - instead this proves the counting logic is
  // correct by checking the exact delta after a known, isolated change.
  test("User totals increase by exactly 1 after a new registration", async () => {
    const before = await request(app).get("/admin/stats").set("authorization", "JWT " + adminToken);
    await request(app).post("/auth/register").send(deltaUser);
    const after = await request(app).get("/admin/stats").set("authorization", "JWT " + adminToken);
    expect(after.body.data.users.total).toBe(before.body.data.users.total + 1);
    expect(after.body.data.users.active).toBe(before.body.data.users.active + 1);
  });

  test("Business totals/pending increase by exactly 1 after a new pending submission", async () => {
    const before = await request(app).get("/admin/stats").set("authorization", "JWT " + adminToken);
    await businessModel.create({
      owner: ownerId,
      name: "Admin Stats Studio",
      description: "A business created only to verify the stats delta.",
      category: categoryId,
      address: "1 Stats Street",
      phone: "0501230000",
      workingHours: [{ day: 0, isOpen: true, startTime: "09:00", endTime: "17:00" }],
      approvalStatus: "pending",
    });
    const after = await request(app).get("/admin/stats").set("authorization", "JWT " + adminToken);
    expect(after.body.data.businesses.total).toBe(before.body.data.businesses.total + 1);
    expect(after.body.data.businesses.pending).toBe(before.body.data.businesses.pending + 1);
  });
});
