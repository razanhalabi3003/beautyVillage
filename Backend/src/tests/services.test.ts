import request from "supertest";
import initApp from "../server";
import mongoose from "mongoose";
import { Express } from "express";
import userModel from "../models/user_model";
import categoryModel from "../models/category_model";
import businessModel from "../models/business_model";
import serviceModel from "../models/service_model";
import bcrypt from "bcrypt";

let app: Express;

// This file's beforeAll creates 6 users (each hashed with bcrypt) and 5
// businesses, plus 6 logins (each comparing with bcrypt) - legitimately
// slower than the default 5s hook timeout.
jest.setTimeout(30000);

const adminUser = {
  name: "Service Admin",
  email: "service_admin_test@gmail.com",
  password: "123456",
};
const customerUser = {
  name: "Service Customer Test",
  email: "service_customer_test@gmail.com",
  password: "123456",
};

let adminToken: string;
let customerToken: string;
let categoryId: string;

let approvedOwnerToken: string;
let approvedBusinessId: string;

let otherOwnerToken: string;

let pendingOwnerToken: string;
let pendingBusinessId: string;

let rejectedOwnerToken: string;
let rejectedBusinessId: string;

let suspendedOwnerToken: string;
let suspendedBusinessId: string;

let serviceId: string;

const workingHours = [{ day: 0, isOpen: true, startTime: "09:00", endTime: "17:00" }];

beforeAll(async () => {
  app = await initApp();

  await userModel.deleteMany({
    email: {
      $in: [
        adminUser.email,
        customerUser.email,
        "service_approved_owner_test@gmail.com",
        "service_other_owner_test@gmail.com",
        "service_pending_owner_test@gmail.com",
        "service_rejected_owner_test@gmail.com",
        "service_suspended_owner_test@gmail.com",
      ],
    },
  });
  await categoryModel.deleteMany({ name: "Service Test Category" });
  await businessModel.deleteMany({
    name: {
      $in: [
        "Service Test Approved Studio",
        "Service Test Other Studio",
        "Service Test Pending Studio",
        "Service Test Rejected Studio",
        "Service Test Suspended Studio",
      ],
    },
  });

  const hashedPassword = await bcrypt.hash("123456", await bcrypt.genSalt(10));

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

  const category = await categoryModel.create({
    name: "Service Test Category",
    slug: "service-test-category",
    isActive: true,
  });
  categoryId = category._id.toString();

  // Main fixture: approved, active business.
  const approvedOwner = await userModel.create({
    name: "Service Approved Owner",
    email: "service_approved_owner_test@gmail.com",
    password: hashedPassword,
    role: "businessOwner",
  });
  const approvedBusiness = await businessModel.create({
    owner: approvedOwner._id,
    name: "Service Test Approved Studio",
    description: "An approved and active business for service tests.",
    category: categoryId,
    address: "1 Service Street",
    phone: "0501230001",
    workingHours,
    approvalStatus: "approved",
    isActive: true,
  });
  approvedBusinessId = approvedBusiness._id.toString();
  const approvedOwnerLogin = await request(app).post("/auth/login").send({
    email: "service_approved_owner_test@gmail.com",
    password: "123456",
  });
  approvedOwnerToken = approvedOwnerLogin.body.accessToken;

  // A second, separate approved business - used to prove an owner cannot
  // create a service under a business that isn't theirs.
  const otherOwner = await userModel.create({
    name: "Service Other Owner",
    email: "service_other_owner_test@gmail.com",
    password: hashedPassword,
    role: "businessOwner",
  });
  await businessModel.create({
    owner: otherOwner._id,
    name: "Service Test Other Studio",
    description: "A separate approved business owned by someone else.",
    category: categoryId,
    address: "2 Service Street",
    phone: "0501230002",
    workingHours,
    approvalStatus: "approved",
    isActive: true,
  });
  const otherOwnerLogin = await request(app).post("/auth/login").send({
    email: "service_other_owner_test@gmail.com",
    password: "123456",
  });
  otherOwnerToken = otherOwnerLogin.body.accessToken;

  // Artificial fixtures: a businessOwner-role user whose business is still
  // pending/rejected. This state can't happen through the normal approval
  // flow (role only upgrades on approval), but is created directly here to
  // isolate and test the "business must be approved" check on its own,
  // separately from the ownership check above.
  const pendingOwner = await userModel.create({
    name: "Service Pending Owner",
    email: "service_pending_owner_test@gmail.com",
    password: hashedPassword,
    role: "businessOwner",
  });
  const pendingBusiness = await businessModel.create({
    owner: pendingOwner._id,
    name: "Service Test Pending Studio",
    description: "A business that is still pending approval.",
    category: categoryId,
    address: "3 Service Street",
    phone: "0501230003",
    workingHours,
    approvalStatus: "pending",
  });
  pendingBusinessId = pendingBusiness._id.toString();
  const pendingOwnerLogin = await request(app).post("/auth/login").send({
    email: "service_pending_owner_test@gmail.com",
    password: "123456",
  });
  pendingOwnerToken = pendingOwnerLogin.body.accessToken;

  const rejectedOwner = await userModel.create({
    name: "Service Rejected Owner",
    email: "service_rejected_owner_test@gmail.com",
    password: hashedPassword,
    role: "businessOwner",
  });
  const rejectedBusiness = await businessModel.create({
    owner: rejectedOwner._id,
    name: "Service Test Rejected Studio",
    description: "A business that was rejected.",
    category: categoryId,
    address: "4 Service Street",
    phone: "0501230004",
    workingHours,
    approvalStatus: "rejected",
    rejectionReason: "Test rejection",
  });
  rejectedBusinessId = rejectedBusiness._id.toString();
  const rejectedOwnerLogin = await request(app).post("/auth/login").send({
    email: "service_rejected_owner_test@gmail.com",
    password: "123456",
  });
  rejectedOwnerToken = rejectedOwnerLogin.body.accessToken;

  // A realistic suspended fixture: approved, then suspended (isActive:false).
  const suspendedOwner = await userModel.create({
    name: "Service Suspended Owner",
    email: "service_suspended_owner_test@gmail.com",
    password: hashedPassword,
    role: "businessOwner",
  });
  const suspendedBusiness = await businessModel.create({
    owner: suspendedOwner._id,
    name: "Service Test Suspended Studio",
    description: "An approved business that has been suspended.",
    category: categoryId,
    address: "5 Service Street",
    phone: "0501230005",
    workingHours,
    approvalStatus: "approved",
    isActive: false,
  });
  suspendedBusinessId = suspendedBusiness._id.toString();
  const suspendedOwnerLogin = await request(app).post("/auth/login").send({
    email: "service_suspended_owner_test@gmail.com",
    password: "123456",
  });
  suspendedOwnerToken = suspendedOwnerLogin.body.accessToken;
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Service Creation Tests", () => {
  test("Customer cannot create a service", async () => {
    const response = await request(app).post("/services")
      .set("authorization", "JWT " + customerToken)
      .send({ business: approvedBusinessId, name: "Manicure", price: 80, durationMinutes: 45 });
    expect(response.statusCode).toBe(403);
  });

  test("BusinessOwner can create a service for their own approved business", async () => {
    const response = await request(app).post("/services")
      .set("authorization", "JWT " + approvedOwnerToken)
      .send({
        business: approvedBusinessId,
        name: "Manicure",
        description: "A classic manicure.",
        price: 80,
        durationMinutes: 45,
      });
    expect(response.statusCode).toBe(201);
    expect(response.body.data.isActive).toBe(true);
    serviceId = response.body.data._id;
  });

  test("Create hardcodes isActive=true", async () => {
    const service = await serviceModel.findById(serviceId);
    expect(service?.isActive).toBe(true);
  });

  test("Owner cannot create a service for another business", async () => {
    const response = await request(app).post("/services")
      .set("authorization", "JWT " + otherOwnerToken)
      .send({ business: approvedBusinessId, name: "Pedicure", price: 90, durationMinutes: 50 });
    expect(response.statusCode).toBe(403);
  });

  test("Owner cannot create a service for a pending business", async () => {
    const response = await request(app).post("/services")
      .set("authorization", "JWT " + pendingOwnerToken)
      .send({ business: pendingBusinessId, name: "Haircut", price: 60, durationMinutes: 30 });
    expect(response.statusCode).toBe(400);
  });

  test("Owner cannot create a service for a rejected business", async () => {
    const response = await request(app).post("/services")
      .set("authorization", "JWT " + rejectedOwnerToken)
      .send({ business: rejectedBusinessId, name: "Haircut", price: 60, durationMinutes: 30 });
    expect(response.statusCode).toBe(400);
  });

  test("Suspended business owner can still create a service", async () => {
    const response = await request(app).post("/services")
      .set("authorization", "JWT " + suspendedOwnerToken)
      .send({ business: suspendedBusinessId, name: "Suspended Business Service", price: 50, durationMinutes: 30 });
    expect(response.statusCode).toBe(201);
  });
});

describe("Service Public Listing Tests", () => {
  test("Public sees active services for an approved+active business", async () => {
    const response = await request(app).get(`/services/business/${approvedBusinessId}`);
    expect(response.statusCode).toBe(200);
    const names = response.body.data.map((s: { name: string }) => s.name);
    expect(names).toContain("Manicure");
  });

  test("Services are hidden if the parent business is pending", async () => {
    const response = await request(app).get(`/services/business/${pendingBusinessId}`);
    expect(response.statusCode).toBe(404);
  });

  test("Services are hidden if the parent business is rejected", async () => {
    const response = await request(app).get(`/services/business/${rejectedBusinessId}`);
    expect(response.statusCode).toBe(404);
  });

  test("Services are hidden if the parent business is suspended", async () => {
    const response = await request(app).get(`/services/business/${suspendedBusinessId}`);
    expect(response.statusCode).toBe(404);
  });

  test("Suspended business owner can still view their own service data", async () => {
    const response = await request(app).get(`/services/business/${suspendedBusinessId}`)
      .set("authorization", "JWT " + suspendedOwnerToken);
    expect(response.statusCode).toBe(200);
  });

  test("Owner can see their own services even when the business is pending", async () => {
    const response = await request(app).get(`/services/business/${pendingBusinessId}`)
      .set("authorization", "JWT " + pendingOwnerToken);
    expect(response.statusCode).toBe(200);
  });
});

describe("Service Update and Delete Tests", () => {
  test("Owner can update their own service", async () => {
    const response = await request(app).put(`/services/${serviceId}`)
      .set("authorization", "JWT " + approvedOwnerToken)
      .send({ price: 95 });
    expect(response.statusCode).toBe(200);
    expect(response.body.data.price).toBe(95);
  });

  test("Non-owner update is rejected", async () => {
    const response = await request(app).put(`/services/${serviceId}`)
      .set("authorization", "JWT " + otherOwnerToken)
      .send({ price: 10 });
    expect(response.statusCode).toBe(403);
  });

  test("JOI rejects business injection on update", async () => {
    const response = await request(app).put(`/services/${serviceId}`)
      .set("authorization", "JWT " + approvedOwnerToken)
      .send({ business: approvedBusinessId, price: 100 });
    expect(response.statusCode).toBe(400);
  });

  test("isActive is now accepted on update, unlike other server-controlled fields", async () => {
    // Deliberately reversed from the original "JOI rejects isActive" rule -
    // isActive:true doubles as the reactivate path here, since there is no
    // separate reactivate route. See "Service Reactivation Tests" below for
    // the full reactivate-after-deactivate cycle and its permission checks.
    const response = await request(app).put(`/services/${serviceId}`)
      .set("authorization", "JWT " + approvedOwnerToken)
      .send({ isActive: true });
    expect(response.statusCode).toBe(200);
    expect(response.body.data.isActive).toBe(true);
  });

  test("DELETE soft-deactivates the service", async () => {
    const response = await request(app).delete(`/services/${serviceId}`)
      .set("authorization", "JWT " + approvedOwnerToken);
    expect(response.statusCode).toBe(200);
    expect(response.body.data.isActive).toBe(false);

    const stillExists = await serviceModel.findById(serviceId);
    expect(stillExists).not.toBeNull();
  });

  test("An inactive service disappears from the public list", async () => {
    const response = await request(app).get(`/services/business/${approvedBusinessId}`);
    const names = response.body.data.map((s: { name: string }) => s.name);
    expect(names).not.toContain("Manicure");
  });

  test("Owner sees active and inactive services, with isActive field present", async () => {
    const response = await request(app).get(`/services/business/${approvedBusinessId}`)
      .set("authorization", "JWT " + approvedOwnerToken);
    const manicure = response.body.data.find((s: { name: string }) => s.name === "Manicure");
    expect(manicure).toBeDefined();
    expect(manicure.isActive).toBe(false);
  });

  test("Admin sees active and inactive services too", async () => {
    const response = await request(app).get(`/services/business/${approvedBusinessId}`)
      .set("authorization", "JWT " + adminToken);
    const manicure = response.body.data.find((s: { name: string }) => s.name === "Manicure");
    expect(manicure).toBeDefined();
  });
});

describe("Service Reactivation Tests", () => {
  test("Owner can reactivate their own inactive service", async () => {
    const response = await request(app).put(`/services/${serviceId}`)
      .set("authorization", "JWT " + approvedOwnerToken)
      .send({ isActive: true });
    expect(response.statusCode).toBe(200);
    expect(response.body.data.isActive).toBe(true);
  });

  test("Reactivated service reappears in the public listing", async () => {
    const response = await request(app).get(`/services/business/${approvedBusinessId}`);
    const names = response.body.data.map((s: { name: string }) => s.name);
    expect(names).toContain("Manicure");
  });

  test("Non-owner cannot reactivate/deactivate someone else's service", async () => {
    // Deactivate again first, so this test starts from a known state.
    await request(app).put(`/services/${serviceId}`)
      .set("authorization", "JWT " + approvedOwnerToken)
      .send({ isActive: false });

    const response = await request(app).put(`/services/${serviceId}`)
      .set("authorization", "JWT " + otherOwnerToken)
      .send({ isActive: true });
    expect(response.statusCode).toBe(403);

    const stillInactive = await serviceModel.findById(serviceId);
    expect(stillInactive?.isActive).toBe(false);
  });

  test("Customer cannot reactivate a service", async () => {
    const response = await request(app).put(`/services/${serviceId}`)
      .set("authorization", "JWT " + customerToken)
      .send({ isActive: true });
    expect(response.statusCode).toBe(403);

    const stillInactive = await serviceModel.findById(serviceId);
    expect(stillInactive?.isActive).toBe(false);
  });

  test("Protected fields are still rejected on update, even alongside isActive", async () => {
    const response = await request(app).put(`/services/${serviceId}`)
      .set("authorization", "JWT " + approvedOwnerToken)
      .send({ isActive: true, business: approvedBusinessId });
    expect(response.statusCode).toBe(400);

    const stillInactive = await serviceModel.findById(serviceId);
    expect(stillInactive?.isActive).toBe(false);
  });
});
