import request from "supertest";
import initApp from "../server";
import mongoose from "mongoose";
import { Express } from "express";
import userModel from "../models/user_model";
import categoryModel from "../models/category_model";
import businessModel from "../models/business_model";
import bcrypt from "bcrypt";

let app: Express;

// This file's beforeAll creates several users (each hashed with bcrypt) and
// several businesses, plus multiple logins - legitimately slower than the
// default 5s hook timeout, same reasoning as services.test.ts/media.test.ts.
jest.setTimeout(30000);

const adminUser = {
  name: "Business Admin",
  email: "business_admin_test@gmail.com",
  password: "123456",
};
const ownerUser = {
  name: "Business Owner Test",
  email: "business_owner_test@gmail.com",
  password: "123456",
};
const otherUser = {
  name: "Other Customer Test",
  email: "other_customer_test@gmail.com",
  password: "123456",
};

let adminToken: string;
let ownerToken: string;
let ownerUserId: string;
let otherToken: string;
let activeCategoryId: string;
let inactiveCategoryId: string;
let businessId: string;
let approvedBusinessId: string;

const validWorkingHours = [
  { day: 0, isOpen: true, startTime: "09:00", endTime: "17:00" },
  { day: 1, isOpen: false },
];

const validBusinessPayload = () => ({
  name: "Test Nail Studio",
  description: "A lovely nail studio offering manicures and pedicures.",
  category: activeCategoryId,
  address: "123 Main Street",
  phone: "0501234567",
  workingHours: validWorkingHours,
});

beforeAll(async () => {
  app = await initApp();

  await userModel.deleteMany({
    email: {
      $in: [
        adminUser.email,
        ownerUser.email,
        otherUser.email,
        "approved_business_owner_test@gmail.com",
        "rejected_business_owner_test@gmail.com",
        "suspended_business_owner_test@gmail.com",
      ],
    },
  });
  await categoryModel.deleteMany({
    name: { $in: ["Business Test Active Category", "Business Test Inactive Category"] },
  });
  await businessModel.deleteMany({
    name: { $in: ["Test Nail Studio", "Approved Glow Salon", "Rejected Salon", "Suspended Salon"] },
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

  await request(app).post("/auth/register").send(ownerUser);
  const ownerLogin = await request(app).post("/auth/login").send({
    email: ownerUser.email,
    password: ownerUser.password,
  });
  ownerToken = ownerLogin.body.accessToken;
  ownerUserId = ownerLogin.body._id;

  await request(app).post("/auth/register").send(otherUser);
  const otherLogin = await request(app).post("/auth/login").send({
    email: otherUser.email,
    password: otherUser.password,
  });
  otherToken = otherLogin.body.accessToken;

  const activeCategory = await categoryModel.create({
    name: "Business Test Active Category",
    slug: "business-test-active-category",
    isActive: true,
  });
  activeCategoryId = activeCategory._id.toString();

  const inactiveCategory = await categoryModel.create({
    name: "Business Test Inactive Category",
    slug: "business-test-inactive-category",
    isActive: false,
  });
  inactiveCategoryId = inactiveCategory._id.toString();

  // Fixture businesses created directly via the model (bypassing the not-yet
  // -built approve/reject/suspend actions) so the public-list and /:id
  // filtering logic can be tested regardless of how a business reached that
  // status.
  const approvedOwner = await userModel.create({
    name: "Approved Business Owner",
    email: "approved_business_owner_test@gmail.com",
    password: hashedPassword,
    role: "businessOwner",
  });
  const approvedBusiness = await businessModel.create({
    owner: approvedOwner._id,
    name: "Approved Glow Salon",
    description: "A fully approved and active business for listing tests.",
    category: activeCategoryId,
    address: "456 Second Street",
    phone: "0509876543",
    workingHours: validWorkingHours,
    approvalStatus: "approved",
    isActive: true,
  });
  approvedBusinessId = approvedBusiness._id.toString();

  const rejectedOwner = await userModel.create({
    name: "Rejected Business Owner",
    email: "rejected_business_owner_test@gmail.com",
    password: hashedPassword,
    role: "customer",
  });
  await businessModel.create({
    owner: rejectedOwner._id,
    name: "Rejected Salon",
    description: "A rejected business that must never appear publicly.",
    category: activeCategoryId,
    address: "789 Third Street",
    phone: "0501112222",
    workingHours: validWorkingHours,
    approvalStatus: "rejected",
    isActive: true,
  });

  const suspendedOwner = await userModel.create({
    name: "Suspended Business Owner",
    email: "suspended_business_owner_test@gmail.com",
    password: hashedPassword,
    role: "businessOwner",
  });
  await businessModel.create({
    owner: suspendedOwner._id,
    name: "Suspended Salon",
    description: "An approved but suspended business that must be hidden.",
    category: activeCategoryId,
    address: "321 Fourth Street",
    phone: "0503334444",
    workingHours: validWorkingHours,
    approvalStatus: "approved",
    isActive: false,
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Business Submission Tests", () => {
  test("Authenticated customer can submit a business", async () => {
    const response = await request(app).post("/businesses")
      .set("authorization", "JWT " + ownerToken)
      .send(validBusinessPayload());
    expect(response.statusCode).toBe(201);
    businessId = response.body.data._id;
  });

  test("New business is pending", async () => {
    const business = await businessModel.findById(businessId);
    expect(business?.approvalStatus).toBe("pending");
  });

  test("New business is active", async () => {
    const business = await businessModel.findById(businessId);
    expect(business?.isActive).toBe(true);
  });

  test("Owner equals authenticated user", async () => {
    const business = await businessModel.findById(businessId);
    expect(business?.owner.toString()).toBe(ownerUserId);
  });

  test("Second business submission by same owner is rejected", async () => {
    const response = await request(app).post("/businesses")
      .set("authorization", "JWT " + ownerToken)
      .send({ ...validBusinessPayload(), name: "Second Studio Attempt" });
    expect(response.statusCode).toBe(400);
  });

  test("Request body cannot inject owner", async () => {
    const response = await request(app).post("/businesses")
      .set("authorization", "JWT " + otherToken)
      .send({ ...validBusinessPayload(), owner: ownerUserId });
    expect(response.statusCode).toBe(400);
  });

  test("Request body cannot inject approvalStatus", async () => {
    const response = await request(app).post("/businesses")
      .set("authorization", "JWT " + otherToken)
      .send({ ...validBusinessPayload(), approvalStatus: "approved" });
    expect(response.statusCode).toBe(400);
  });

  test("Request body cannot inject isActive", async () => {
    const response = await request(app).post("/businesses")
      .set("authorization", "JWT " + otherToken)
      .send({ ...validBusinessPayload(), isActive: false });
    expect(response.statusCode).toBe(400);
  });

  test("Inactive category cannot be used", async () => {
    const response = await request(app).post("/businesses")
      .set("authorization", "JWT " + otherToken)
      .send({ ...validBusinessPayload(), category: inactiveCategoryId });
    expect(response.statusCode).toBe(400);
  });

  test("Nonexistent category cannot be used", async () => {
    const fakeCategoryId = new mongoose.Types.ObjectId().toString();
    const response = await request(app).post("/businesses")
      .set("authorization", "JWT " + otherToken)
      .send({ ...validBusinessPayload(), category: fakeCategoryId });
    expect(response.statusCode).toBe(400);
  });

  test("Admin cannot submit a normal business", async () => {
    const response = await request(app).post("/businesses")
      .set("authorization", "JWT " + adminToken)
      .send(validBusinessPayload());
    expect(response.statusCode).toBe(403);
  });
});

describe("Business /mine Tests", () => {
  test("Pending customer can access their own business via /mine", async () => {
    const response = await request(app).get("/businesses/mine")
      .set("authorization", "JWT " + ownerToken);
    expect(response.statusCode).toBe(200);
    expect(response.body.data.name).toBe("Test Nail Studio");
    expect(response.body.data.approvalStatus).toBe("pending");
  });

  test("/mine returns rejectionReason when present", async () => {
    await businessModel.updateOne(
      { _id: businessId },
      { rejectionReason: "Missing required documentation" }
    );
    const response = await request(app).get("/businesses/mine")
      .set("authorization", "JWT " + ownerToken);
    expect(response.body.data.rejectionReason).toBe("Missing required documentation");

    // Clean up so later tests aren't affected by this direct DB mutation.
    await businessModel.updateOne({ _id: businessId }, { $unset: { rejectionReason: "" } });
  });

  test("Another user's business is never returned from /mine", async () => {
    const response = await request(app).get("/businesses/mine")
      .set("authorization", "JWT " + otherToken);
    expect(response.statusCode).toBe(200);
    expect(response.body.data).toBeNull();
  });
});

describe("Business /pending Tests", () => {
  test("Customer receives 403 on /pending", async () => {
    const response = await request(app).get("/businesses/pending")
      .set("authorization", "JWT " + ownerToken);
    expect(response.statusCode).toBe(403);
  });

  test("Admin can see pending businesses", async () => {
    const response = await request(app).get("/businesses/pending")
      .set("authorization", "JWT " + adminToken);
    expect(response.statusCode).toBe(200);
    const names = response.body.data.map((b: { name: string }) => b.name);
    expect(names).toContain("Test Nail Studio");
  });

  test("Pending response exposes only safe owner fields", async () => {
    const response = await request(app).get("/businesses/pending")
      .set("authorization", "JWT " + adminToken);
    const entry = response.body.data.find((b: { name: string }) => b.name === "Test Nail Studio");
    expect(entry.owner.password).toBeUndefined();
    expect(entry.owner.refreshTokens).toBeUndefined();
    expect(entry.owner.name).toBeDefined();
  });
});

describe("Public Business Listing Tests", () => {
  test("Pending businesses are excluded from the public list", async () => {
    const response = await request(app).get("/businesses");
    const names = response.body.data.map((b: { name: string }) => b.name);
    expect(names).not.toContain("Test Nail Studio");
  });

  test("Rejected businesses are excluded from the public list", async () => {
    const response = await request(app).get("/businesses");
    const names = response.body.data.map((b: { name: string }) => b.name);
    expect(names).not.toContain("Rejected Salon");
  });

  test("Suspended/inactive businesses are excluded from the public list", async () => {
    const response = await request(app).get("/businesses");
    const names = response.body.data.map((b: { name: string }) => b.name);
    expect(names).not.toContain("Suspended Salon");
  });

  test("Approved and active businesses are included", async () => {
    const response = await request(app).get("/businesses");
    const names = response.body.data.map((b: { name: string }) => b.name);
    expect(names).toContain("Approved Glow Salon");
  });

  test("Search works", async () => {
    const response = await request(app).get("/businesses?search=Glow");
    const names = response.body.data.map((b: { name: string }) => b.name);
    expect(names).toContain("Approved Glow Salon");
    expect(names).not.toContain("Test Nail Studio");
  });

  test("Category filter works", async () => {
    const response = await request(app).get(`/businesses?category=${activeCategoryId}`);
    const names = response.body.data.map((b: { name: string }) => b.name);
    expect(names).toContain("Approved Glow Salon");
  });

  test("Pagination metadata works", async () => {
    const response = await request(app).get("/businesses?page=1&limit=1");
    expect(response.body.pagination.page).toBe(1);
    expect(response.body.pagination.limit).toBe(1);
    expect(response.body.data.length).toBeLessThanOrEqual(1);
  });
});

describe("Business /:id Tests", () => {
  test("Approved+active business is visible to a guest", async () => {
    const response = await request(app).get(`/businesses/${approvedBusinessId}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.data.name).toBe("Approved Glow Salon");
  });

  test("Pending business is hidden from a guest", async () => {
    const response = await request(app).get(`/businesses/${businessId}`);
    expect(response.statusCode).toBe(404);
  });

  test("Owner can view their own pending business", async () => {
    const response = await request(app).get(`/businesses/${businessId}`)
      .set("authorization", "JWT " + ownerToken);
    expect(response.statusCode).toBe(200);
  });

  test("Admin can view a pending business", async () => {
    const response = await request(app).get(`/businesses/${businessId}`)
      .set("authorization", "JWT " + adminToken);
    expect(response.statusCode).toBe(200);
  });

  test("Unrelated authenticated user cannot view a private business", async () => {
    const response = await request(app).get(`/businesses/${businessId}`)
      .set("authorization", "JWT " + otherToken);
    expect(response.statusCode).toBe(404);
  });
});

describe("Business Update, Approve, Reject, Suspend Tests", () => {
  const rejectedForResetUser = {
    name: "Rejected Reset Owner",
    email: "rejected_reset_owner_test@gmail.com",
    password: "123456",
  };
  const approveTestUser = {
    name: "Approve Test Owner",
    email: "approve_test_owner_test@gmail.com",
    password: "123456",
  };
  const rejectTestUser = {
    name: "Reject Test Owner",
    email: "reject_test_owner_test@gmail.com",
    password: "123456",
  };

  let rejectedResetToken: string;
  let rejectedResetBusinessId: string;
  let approveTestToken: string;
  let approveTestBusinessId: string;
  let rejectTestToken: string;
  let rejectTestBusinessId: string;
  let approvedOwnerId: string;

  beforeAll(async () => {
    await userModel.deleteMany({
      email: { $in: [rejectedForResetUser.email, approveTestUser.email, rejectTestUser.email] },
    });
    await businessModel.deleteMany({
      name: { $in: ["Rejected Reset Studio", "Approve Test Studio", "Reject Test Studio"] },
    });

    await request(app).post("/auth/register").send(rejectedForResetUser);
    const rejectedResetLogin = await request(app).post("/auth/login").send({
      email: rejectedForResetUser.email,
      password: rejectedForResetUser.password,
    });
    rejectedResetToken = rejectedResetLogin.body.accessToken;
    const rejectedResetBusiness = await businessModel.create({
      owner: rejectedResetLogin.body._id,
      name: "Rejected Reset Studio",
      description: "A business that was rejected and will be resubmitted by its owner.",
      category: activeCategoryId,
      address: "1 Reset Street",
      phone: "0501110001",
      workingHours: validWorkingHours,
      approvalStatus: "rejected",
      rejectionReason: "Initial rejection reason",
    });
    rejectedResetBusinessId = rejectedResetBusiness._id.toString();

    await request(app).post("/auth/register").send(approveTestUser);
    const approveTestLogin = await request(app).post("/auth/login").send({
      email: approveTestUser.email,
      password: approveTestUser.password,
    });
    approveTestToken = approveTestLogin.body.accessToken;
    const approveTestBusiness = await businessModel.create({
      owner: approveTestLogin.body._id,
      name: "Approve Test Studio",
      description: "A pending business used to test the approve action.",
      category: activeCategoryId,
      address: "2 Approve Street",
      phone: "0501110002",
      workingHours: validWorkingHours,
      approvalStatus: "pending",
      rejectionReason: "Old leftover reason",
    });
    approveTestBusinessId = approveTestBusiness._id.toString();

    await request(app).post("/auth/register").send(rejectTestUser);
    const rejectTestLogin = await request(app).post("/auth/login").send({
      email: rejectTestUser.email,
      password: rejectTestUser.password,
    });
    rejectTestToken = rejectTestLogin.body.accessToken;
    const rejectTestBusiness = await businessModel.create({
      owner: rejectTestLogin.body._id,
      name: "Reject Test Studio",
      description: "A pending business used to test the reject action.",
      category: activeCategoryId,
      address: "3 Reject Street",
      phone: "0501110003",
      workingHours: validWorkingHours,
      approvalStatus: "pending",
    });
    rejectTestBusinessId = rejectTestBusiness._id.toString();

    const approvedOwner = await userModel.findOne({ email: "approved_business_owner_test@gmail.com" });
    approvedOwnerId = approvedOwner!._id.toString();
  });

  describe("Update", () => {
    test("Owner can update own business", async () => {
      const response = await request(app).put(`/businesses/${businessId}`)
        .set("authorization", "JWT " + ownerToken)
        .send({ description: "An updated description for the nail studio." });
      expect(response.statusCode).toBe(200);
      expect(response.body.data.description).toBe("An updated description for the nail studio.");
    });

    test("Non-owner cannot update business", async () => {
      const response = await request(app).put(`/businesses/${businessId}`)
        .set("authorization", "JWT " + otherToken)
        .send({ description: "Hacked description" });
      expect(response.statusCode).toBe(403);
    });

    test("Admin cannot edit business content through the owner update endpoint", async () => {
      const response = await request(app).put(`/businesses/${businessId}`)
        .set("authorization", "JWT " + adminToken)
        .send({ description: "Admin trying to edit" });
      expect(response.statusCode).toBe(403);
    });

    test("Inactive category cannot be selected during update", async () => {
      const response = await request(app).put(`/businesses/${businessId}`)
        .set("authorization", "JWT " + ownerToken)
        .send({ category: inactiveCategoryId });
      expect(response.statusCode).toBe(400);
    });

    test("Nonexistent category cannot be selected during update", async () => {
      const fakeCategoryId = new mongoose.Types.ObjectId().toString();
      const response = await request(app).put(`/businesses/${businessId}`)
        .set("authorization", "JWT " + ownerToken)
        .send({ category: fakeCategoryId });
      expect(response.statusCode).toBe(400);
    });

    test("Rejected owner edit resets status to pending and clears rejectionReason", async () => {
      const response = await request(app).put(`/businesses/${rejectedResetBusinessId}`)
        .set("authorization", "JWT " + rejectedResetToken)
        .send({ description: "Resubmitting with an improved description." });
      expect(response.statusCode).toBe(200);
      expect(response.body.data.approvalStatus).toBe("pending");
      expect(response.body.data.rejectionReason).toBeFalsy();
    });

    test("JOI rejects owner injection on update", async () => {
      const response = await request(app).put(`/businesses/${businessId}`)
        .set("authorization", "JWT " + ownerToken)
        .send({ owner: otherToken, description: "x" });
      expect(response.statusCode).toBe(400);
    });

    test("JOI rejects approvalStatus injection on update", async () => {
      const response = await request(app).put(`/businesses/${businessId}`)
        .set("authorization", "JWT " + ownerToken)
        .send({ approvalStatus: "approved" });
      expect(response.statusCode).toBe(400);
    });

    test("JOI rejects isActive injection on update", async () => {
      const response = await request(app).put(`/businesses/${businessId}`)
        .set("authorization", "JWT " + ownerToken)
        .send({ isActive: false });
      expect(response.statusCode).toBe(400);
    });

    test("JOI rejects averageRating/reviewCount injection on update", async () => {
      const response = await request(app).put(`/businesses/${businessId}`)
        .set("authorization", "JWT " + ownerToken)
        .send({ averageRating: 5, reviewCount: 100 });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("Approve", () => {
    test("Owner cannot approve own business", async () => {
      const response = await request(app).put(`/businesses/${approveTestBusinessId}/approve`)
        .set("authorization", "JWT " + approveTestToken);
      expect(response.statusCode).toBe(403);
    });

    test("Customer cannot approve", async () => {
      const response = await request(app).put(`/businesses/${approveTestBusinessId}/approve`)
        .set("authorization", "JWT " + otherToken);
      expect(response.statusCode).toBe(403);
    });

    test("Admin can approve a pending business", async () => {
      const response = await request(app).put(`/businesses/${approveTestBusinessId}/approve`)
        .set("authorization", "JWT " + adminToken);
      expect(response.statusCode).toBe(200);
    });

    test("Approval changes status to approved", async () => {
      const business = await businessModel.findById(approveTestBusinessId);
      expect(business?.approvalStatus).toBe("approved");
    });

    test("Approval sets business isActive=true", async () => {
      const business = await businessModel.findById(approveTestBusinessId);
      expect(business?.isActive).toBe(true);
    });

    test("Approval clears old rejectionReason if present", async () => {
      const business = await businessModel.findById(approveTestBusinessId);
      expect(business?.rejectionReason).toBeFalsy();
    });

    test("Approval upgrades owner role to businessOwner", async () => {
      const owner = await userModel.findOne({ email: approveTestUser.email });
      expect(owner?.role).toBe("businessOwner");
    });

    test("Approval does not alter unrelated user fields", async () => {
      const owner = await userModel.findOne({ email: approveTestUser.email });
      expect(owner?.name).toBe(approveTestUser.name);
      expect(owner?.isActive).toBe(true);
    });

    test("Approving a non-pending business is rejected", async () => {
      const response = await request(app).put(`/businesses/${approveTestBusinessId}/approve`)
        .set("authorization", "JWT " + adminToken);
      expect(response.statusCode).toBe(400);
    });

    test("Transaction leaves a consistent state", async () => {
      const business = await businessModel.findById(approveTestBusinessId);
      const owner = await userModel.findOne({ email: approveTestUser.email });
      expect(business?.approvalStatus).toBe("approved");
      expect(owner?.role).toBe("businessOwner");
    });
  });

  describe("Reject", () => {
    test("Customer/owner cannot reject", async () => {
      const response = await request(app).put(`/businesses/${rejectTestBusinessId}/reject`)
        .set("authorization", "JWT " + rejectTestToken)
        .send({ rejectionReason: "Trying to self-reject" });
      expect(response.statusCode).toBe(403);
    });

    test("RejectionReason is required", async () => {
      const response = await request(app).put(`/businesses/${rejectTestBusinessId}/reject`)
        .set("authorization", "JWT " + adminToken)
        .send({});
      expect(response.statusCode).toBe(400);
    });

    test("Admin can reject a pending business", async () => {
      const response = await request(app).put(`/businesses/${rejectTestBusinessId}/reject`)
        .set("authorization", "JWT " + adminToken)
        .send({ rejectionReason: "Missing valid business license." });
      expect(response.statusCode).toBe(200);
    });

    test("Rejection stores rejectionReason", async () => {
      const business = await businessModel.findById(rejectTestBusinessId);
      expect(business?.rejectionReason).toBe("Missing valid business license.");
      expect(business?.approvalStatus).toBe("rejected");
    });

    test("Rejection does not upgrade/change owner role", async () => {
      const owner = await userModel.findOne({ email: rejectTestUser.email });
      expect(owner?.role).toBe("customer");
    });

    test("Rejecting a non-pending business is rejected", async () => {
      const response = await request(app).put(`/businesses/${rejectTestBusinessId}/reject`)
        .set("authorization", "JWT " + adminToken)
        .send({ rejectionReason: "Trying again" });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("Suspend / Reactivate", () => {
    test("Non-admin cannot suspend", async () => {
      const response = await request(app).put(`/businesses/${approvedBusinessId}/suspend`)
        .set("authorization", "JWT " + ownerToken)
        .send({ isActive: false });
      expect(response.statusCode).toBe(403);
    });

    test("Admin can suspend an approved business", async () => {
      const response = await request(app).put(`/businesses/${approvedBusinessId}/suspend`)
        .set("authorization", "JWT " + adminToken)
        .send({ isActive: false });
      expect(response.statusCode).toBe(200);
      expect(response.body.data.isActive).toBe(false);
    });

    test("Suspended business disappears from public GET /businesses", async () => {
      const response = await request(app).get("/businesses");
      const names = response.body.data.map((b: { name: string }) => b.name);
      expect(names).not.toContain("Approved Glow Salon");
    });

    test("Admin can reactivate", async () => {
      const response = await request(app).put(`/businesses/${approvedBusinessId}/suspend`)
        .set("authorization", "JWT " + adminToken)
        .send({ isActive: true });
      expect(response.statusCode).toBe(200);
      expect(response.body.data.isActive).toBe(true);
    });

    test("Reactivated approved business becomes public again", async () => {
      const response = await request(app).get("/businesses");
      const names = response.body.data.map((b: { name: string }) => b.name);
      expect(names).toContain("Approved Glow Salon");
    });

    test("Suspension/reactivation does not change businessOwner role", async () => {
      const owner = await userModel.findById(approvedOwnerId);
      expect(owner?.role).toBe("businessOwner");
    });

    test("Suspension does not change approvalStatus", async () => {
      const business = await businessModel.findById(approvedBusinessId);
      expect(business?.approvalStatus).toBe("approved");
    });
  });
});

describe("Business /admin Tests", () => {
  // By this point in the file: businessId ("Test Nail Studio") is still
  // pending, "Rejected Salon" is rejected, "Suspended Salon" is
  // approved+inactive, and approvedBusinessId ("Approved Glow Salon") has
  // been reactivated back to approved+active by the block above.
  test("Customer receives 403 on /admin", async () => {
    const response = await request(app).get("/businesses/admin")
      .set("authorization", "JWT " + otherToken);
    expect(response.statusCode).toBe(403);
  });

  test("Admin can list all businesses regardless of status", async () => {
    const response = await request(app).get("/businesses/admin")
      .set("authorization", "JWT " + adminToken);
    expect(response.statusCode).toBe(200);
    const names = response.body.data.map((b: { name: string }) => b.name);
    expect(names).toContain("Test Nail Studio");
    expect(names).toContain("Approved Glow Salon");
    expect(names).toContain("Rejected Salon");
    expect(names).toContain("Suspended Salon");
  });

  test("status=pending filters correctly", async () => {
    const response = await request(app).get("/businesses/admin?status=pending")
      .set("authorization", "JWT " + adminToken);
    const names = response.body.data.map((b: { name: string }) => b.name);
    expect(names).toContain("Test Nail Studio");
    expect(names).not.toContain("Approved Glow Salon");
  });

  test("status=approved filters correctly (includes suspended)", async () => {
    const response = await request(app).get("/businesses/admin?status=approved")
      .set("authorization", "JWT " + adminToken);
    const names = response.body.data.map((b: { name: string }) => b.name);
    expect(names).toContain("Approved Glow Salon");
    expect(names).toContain("Suspended Salon");
    expect(names).not.toContain("Test Nail Studio");
    expect(names).not.toContain("Rejected Salon");
  });

  test("status=rejected filters correctly", async () => {
    const response = await request(app).get("/businesses/admin?status=rejected")
      .set("authorization", "JWT " + adminToken);
    const names = response.body.data.map((b: { name: string }) => b.name);
    expect(names).toContain("Rejected Salon");
    expect(names).not.toContain("Approved Glow Salon");
  });

  test("Pagination metadata works", async () => {
    const response = await request(app).get("/businesses/admin?page=1&limit=1")
      .set("authorization", "JWT " + adminToken);
    expect(response.body.pagination.page).toBe(1);
    expect(response.body.pagination.limit).toBe(1);
    expect(response.body.data.length).toBeLessThanOrEqual(1);
  });

  test("Owner and category are populated with safe fields only", async () => {
    const response = await request(app).get("/businesses/admin?status=approved")
      .set("authorization", "JWT " + adminToken);
    const entry = response.body.data.find((b: { name: string }) => b.name === "Approved Glow Salon");
    expect(entry.owner.name).toBeDefined();
    expect(entry.owner.email).toBeDefined();
    expect(entry.owner.password).toBeUndefined();
    expect(entry.owner.refreshTokens).toBeUndefined();
    expect(entry.category.name).toBeDefined();
    expect(entry.category.slug).toBeDefined();
  });
});
