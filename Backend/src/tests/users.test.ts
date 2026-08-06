import request from "supertest";
import initApp from "../server";
import mongoose from "mongoose";
import { Express } from "express";
import userModel from "../models/user_model";
import bcrypt from "bcrypt";

let app: Express;

const validUser = {
  name: "Joi Valid User",
  email: "joi_valid_user@gmail.com",
  password: "123456",
};

beforeAll(async () => {
  app = await initApp();
  // Only clean up emails this file itself creates, so re-running this
  // suite is idempotent without touching other suites' data.
  await userModel.deleteMany({ email: validUser.email });
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Auth Validation (JOI) Tests", () => {
  test("Register without name returns 400", async () => {
    const response = await request(app).post("/auth/register").send({
      email: "joi_no_name@gmail.com",
      password: "123456",
    });
    expect(response.statusCode).toBe(400);
  });

  test("Register with role field returns 400", async () => {
    const response = await request(app).post("/auth/register").send({
      name: "Role Attempt",
      email: "joi_role_attempt@gmail.com",
      password: "123456",
      role: "admin",
    });
    expect(response.statusCode).toBe(400);
  });

  test("Register with malformed email returns 400", async () => {
    const response = await request(app).post("/auth/register").send({
      name: "Bad Email",
      email: "not-an-email",
      password: "123456",
    });
    expect(response.statusCode).toBe(400);
  });

  test("Login with malformed email returns 400", async () => {
    const response = await request(app).post("/auth/login").send({
      email: "not-an-email",
      password: "123456",
    });
    expect(response.statusCode).toBe(400);
  });

  test("Valid register still returns 201", async () => {
    const response = await request(app).post("/auth/register").send(validUser);
    expect(response.statusCode).toBe(201);
  });

  test("Valid login still works", async () => {
    const response = await request(app).post("/auth/login").send({
      email: validUser.email,
      password: validUser.password,
    });
    expect(response.statusCode).toBe(200);
    expect(response.body.accessToken).toBeDefined();
  });
});

describe("DB-backed authMiddleware Tests", () => {
  test("A user with a still-valid token is rejected immediately after isActive becomes false", async () => {
    const suspendUser = {
      name: "Suspend Test User",
      email: "suspend_test_user@gmail.com",
      password: "123456",
    };
    await userModel.deleteMany({ email: suspendUser.email });
    await request(app).post("/auth/register").send(suspendUser);
    const loginResponse = await request(app).post("/auth/login").send({
      email: suspendUser.email,
      password: suspendUser.password,
    });
    const token = loginResponse.body.accessToken;
    expect(token).toBeDefined();

    // Sanity check: the token works normally while the user is active.
    const beforeSuspend = await request(app).post("/posts")
      .set("authorization", "JWT " + token)
      .send({ title: "Before suspend", content: "..." });
    expect(beforeSuspend.statusCode).toBe(201);

    // Suspend directly in the database, bypassing any API - simulates an
    // admin suspending the user while this token is still unexpired.
    await userModel.updateOne({ email: suspendUser.email }, { isActive: false });

    const afterSuspend = await request(app).post("/posts")
      .set("authorization", "JWT " + token)
      .send({ title: "After suspend", content: "..." });
    expect(afterSuspend.statusCode).toBe(403);
  });

  test("A token belonging to a deleted user returns 401", async () => {
    const deletedUser = {
      name: "Deleted Test User",
      email: "deleted_test_user@gmail.com",
      password: "123456",
    };
    await userModel.deleteMany({ email: deletedUser.email });
    await request(app).post("/auth/register").send(deletedUser);
    const loginResponse = await request(app).post("/auth/login").send({
      email: deletedUser.email,
      password: deletedUser.password,
    });
    const token = loginResponse.body.accessToken;
    expect(token).toBeDefined();

    await userModel.deleteOne({ email: deletedUser.email });

    const response = await request(app).post("/posts")
      .set("authorization", "JWT " + token)
      .send({ title: "Should fail", content: "..." });
    expect(response.statusCode).toBe(401);
  });

  test("A normal active user can still access a protected route", async () => {
    const activeUser = {
      name: "Active Test User",
      email: "active_test_user@gmail.com",
      password: "123456",
    };
    await userModel.deleteMany({ email: activeUser.email });
    await request(app).post("/auth/register").send(activeUser);
    const loginResponse = await request(app).post("/auth/login").send({
      email: activeUser.email,
      password: activeUser.password,
    });
    const token = loginResponse.body.accessToken;
    expect(token).toBeDefined();

    const response = await request(app).post("/posts")
      .set("authorization", "JWT " + token)
      .send({ title: "Active user post", content: "..." });
    expect(response.statusCode).toBe(201);
  });
});

describe("Login and Refresh Security Tests", () => {
  test("Inactive user cannot log in", async () => {
    const inactiveUser = {
      name: "Inactive Login User",
      email: "inactive_login_test@gmail.com",
      password: "123456",
    };
    await userModel.deleteMany({ email: inactiveUser.email });
    await request(app).post("/auth/register").send(inactiveUser);
    await userModel.updateOne({ email: inactiveUser.email }, { isActive: false });

    const response = await request(app).post("/auth/login").send({
      email: inactiveUser.email,
      password: inactiveUser.password,
    });
    expect(response.statusCode).toBe(403);
  });

  test("Suspended user cannot refresh", async () => {
    const suspendRefreshUser = {
      name: "Suspend Refresh User",
      email: "suspend_refresh_test@gmail.com",
      password: "123456",
    };
    await userModel.deleteMany({ email: suspendRefreshUser.email });
    await request(app).post("/auth/register").send(suspendRefreshUser);
    const loginResponse = await request(app).post("/auth/login").send({
      email: suspendRefreshUser.email,
      password: suspendRefreshUser.password,
    });
    const refreshToken = loginResponse.body.refreshToken;
    expect(refreshToken).toBeDefined();

    await userModel.updateOne({ email: suspendRefreshUser.email }, { isActive: false });

    const response = await request(app).post("/auth/refresh").send({ refreshToken });
    expect(response.statusCode).toBe(403);
  });

  test("Deleted user cannot refresh", async () => {
    const deletedRefreshUser = {
      name: "Deleted Refresh User",
      email: "deleted_refresh_test@gmail.com",
      password: "123456",
    };
    await userModel.deleteMany({ email: deletedRefreshUser.email });
    await request(app).post("/auth/register").send(deletedRefreshUser);
    const loginResponse = await request(app).post("/auth/login").send({
      email: deletedRefreshUser.email,
      password: deletedRefreshUser.password,
    });
    const refreshToken = loginResponse.body.refreshToken;
    expect(refreshToken).toBeDefined();

    await userModel.deleteOne({ email: deletedRefreshUser.email });

    const response = await request(app).post("/auth/refresh").send({ refreshToken });
    expect(response.statusCode).toBe(401);
  });

  test("Active user can still refresh successfully", async () => {
    const activeRefreshUser = {
      name: "Active Refresh User",
      email: "active_refresh_test@gmail.com",
      password: "123456",
    };
    await userModel.deleteMany({ email: activeRefreshUser.email });
    await request(app).post("/auth/register").send(activeRefreshUser);
    const loginResponse = await request(app).post("/auth/login").send({
      email: activeRefreshUser.email,
      password: activeRefreshUser.password,
    });
    const refreshToken = loginResponse.body.refreshToken;
    expect(refreshToken).toBeDefined();

    const response = await request(app).post("/auth/refresh").send({ refreshToken });
    expect(response.statusCode).toBe(200);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
  });

  test("Login response does not include password", async () => {
    const safeFieldsUser = {
      name: "Safe Fields User",
      email: "safe_fields_test@gmail.com",
      password: "123456",
    };
    await userModel.deleteMany({ email: safeFieldsUser.email });
    await request(app).post("/auth/register").send(safeFieldsUser);
    const response = await request(app).post("/auth/login").send({
      email: safeFieldsUser.email,
      password: safeFieldsUser.password,
    });
    expect(response.body.password).toBeUndefined();
  });

  test("Login response does not include refreshTokens", async () => {
    const safeFieldsUser2 = {
      name: "Safe Fields User 2",
      email: "safe_fields_test_2@gmail.com",
      password: "123456",
    };
    await userModel.deleteMany({ email: safeFieldsUser2.email });
    await request(app).post("/auth/register").send(safeFieldsUser2);
    const response = await request(app).post("/auth/login").send({
      email: safeFieldsUser2.email,
      password: safeFieldsUser2.password,
    });
    expect(response.body.refreshTokens).toBeUndefined();
  });
});

describe("Users Resource and Authorization Tests", () => {
  const adminUser = {
    name: "Admin Resource Test",
    email: "admin_resource_test@gmail.com",
    password: "123456",
  };
  const userA = {
    name: "User A Resource Test",
    email: "user_a_resource_test@gmail.com",
    password: "123456",
  };
  const userB = {
    name: "User B Resource Test",
    email: "user_b_resource_test@gmail.com",
    password: "123456",
  };

  let adminToken: string;
  let userAToken: string;
  let userAId: string;
  let userBToken: string;
  let userBId: string;

  beforeAll(async () => {
    await userModel.deleteMany({
      email: { $in: [adminUser.email, userA.email, userB.email] },
    });

    // Admin is created directly via the model, bypassing the public register
    // endpoint entirely - there is no route that can create an admin.
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

    await request(app).post("/auth/register").send(userA);
    const userALogin = await request(app).post("/auth/login").send({
      email: userA.email,
      password: userA.password,
    });
    userAToken = userALogin.body.accessToken;
    userAId = userALogin.body._id;

    await request(app).post("/auth/register").send(userB);
    const userBLogin = await request(app).post("/auth/login").send({
      email: userB.email,
      password: userB.password,
    });
    userBToken = userBLogin.body.accessToken;
    userBId = userBLogin.body._id;
  });

  test("GET /auth/me returns safe current user", async () => {
    const response = await request(app).get("/auth/me")
      .set("authorization", "JWT " + userAToken);
    expect(response.statusCode).toBe(200);
    expect(response.body.email).toBe(userA.email);
    expect(response.body.password).toBeUndefined();
    expect(response.body.refreshTokens).toBeUndefined();
  });

  test("Self can GET own profile", async () => {
    const response = await request(app).get(`/users/${userAId}`)
      .set("authorization", "JWT " + userAToken);
    expect(response.statusCode).toBe(200);
  });

  test("Customer cannot GET another user's profile", async () => {
    const response = await request(app).get(`/users/${userBId}`)
      .set("authorization", "JWT " + userAToken);
    expect(response.statusCode).toBe(403);
  });

  test("Admin can GET another user's profile", async () => {
    const response = await request(app).get(`/users/${userAId}`)
      .set("authorization", "JWT " + adminToken);
    expect(response.statusCode).toBe(200);
  });

  test("Self can update name/phone/avatar", async () => {
    const response = await request(app).put(`/users/${userAId}`)
      .set("authorization", "JWT " + userAToken)
      .send({ name: "User A Updated", phone: "0501234567", avatar: "avatar.png" });
    expect(response.statusCode).toBe(200);
    expect(response.body.data.name).toBe("User A Updated");
  });

  test("Update rejects role injection", async () => {
    const response = await request(app).put(`/users/${userAId}`)
      .set("authorization", "JWT " + userAToken)
      .send({ name: "Hacker", role: "admin" });
    expect(response.statusCode).toBe(400);
  });

  test("Customer cannot GET /users", async () => {
    const response = await request(app).get("/users")
      .set("authorization", "JWT " + userAToken);
    expect(response.statusCode).toBe(403);
  });

  test("Admin can GET /users", async () => {
    const response = await request(app).get("/users")
      .set("authorization", "JWT " + adminToken);
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test("Customer cannot update user status", async () => {
    const response = await request(app).put(`/users/${userBId}/status`)
      .set("authorization", "JWT " + userAToken)
      .send({ isActive: false });
    expect(response.statusCode).toBe(403);
  });

  test("Admin can suspend and reactivate a user", async () => {
    const suspendResponse = await request(app).put(`/users/${userBId}/status`)
      .set("authorization", "JWT " + adminToken)
      .send({ isActive: false });
    expect(suspendResponse.statusCode).toBe(200);
    expect(suspendResponse.body.data.isActive).toBe(false);

    const reactivateResponse = await request(app).put(`/users/${userBId}/status`)
      .set("authorization", "JWT " + adminToken)
      .send({ isActive: true });
    expect(reactivateResponse.statusCode).toBe(200);
    expect(reactivateResponse.body.data.isActive).toBe(true);
  });

  test("Status endpoint changes only isActive", async () => {
    const response = await request(app).put(`/users/${userBId}/status`)
      .set("authorization", "JWT " + adminToken)
      .send({ isActive: true });
    expect(response.statusCode).toBe(200);
    expect(response.body.data.name).toBe(userB.name);
    expect(response.body.data.email).toBe(userB.email);
  });

  test("Authorize rejects an unauthorized role", async () => {
    const response = await request(app).get("/users")
      .set("authorization", "JWT " + userBToken);
    expect(response.statusCode).toBe(403);
    expect(response.body.success).toBe(false);
  });
});
