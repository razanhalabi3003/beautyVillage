import request from "supertest";
import initApp from "../server";
import mongoose from "mongoose";
import { Express } from "express";
import userModel from "../models/user_model";
import categoryModel from "../models/category_model";
import businessModel from "../models/business_model";
import mediaModel from "../models/media_model";
import bcrypt from "bcrypt";

let app: Express;

// Several users/businesses are created (each with bcrypt hashing) plus
// multiple file uploads - legitimately slower than the default 5s timeout.
jest.setTimeout(30000);

const adminUser = { name: "Media Admin", email: "media_admin_test@gmail.com", password: "123456" };
const customerUser = { name: "Media Customer", email: "media_customer_test@gmail.com", password: "123456" };

let adminToken: string;
let customerToken: string;
let categoryId: string;

let ownerToken: string;
let businessId: string;

let otherOwnerToken: string;

let pendingOwnerToken: string;
let pendingBusinessId: string;

const workingHours = [{ day: 0, isOpen: true, startTime: "09:00", endTime: "17:00" }];

const tinyJpegBuffer = Buffer.from("fake-jpeg-bytes-for-testing");
const oversizedBuffer = Buffer.alloc(3 * 1024 * 1024, 1); // 3MB, over the 2MB limit

beforeAll(async () => {
  app = await initApp();

  await userModel.deleteMany({
    email: {
      $in: [
        adminUser.email,
        customerUser.email,
        "media_owner_test@gmail.com",
        "media_other_owner_test@gmail.com",
        "media_pending_owner_test@gmail.com",
      ],
    },
  });
  await categoryModel.deleteMany({ name: "Media Test Category" });
  await businessModel.deleteMany({
    name: { $in: ["Media Test Studio", "Media Test Other Studio", "Media Test Pending Studio"] },
  });

  const hashedPassword = await bcrypt.hash("123456", await bcrypt.genSalt(10));

  await userModel.create({ name: adminUser.name, email: adminUser.email, password: hashedPassword, role: "admin" });
  const adminLogin = await request(app).post("/auth/login").send({ email: adminUser.email, password: adminUser.password });
  adminToken = adminLogin.body.accessToken;

  await request(app).post("/auth/register").send(customerUser);
  const customerLogin = await request(app).post("/auth/login").send({ email: customerUser.email, password: customerUser.password });
  customerToken = customerLogin.body.accessToken;

  const category = await categoryModel.create({ name: "Media Test Category", slug: "media-test-category", isActive: true });
  categoryId = category._id.toString();

  const owner = await userModel.create({
    name: "Media Owner",
    email: "media_owner_test@gmail.com",
    password: hashedPassword,
    role: "businessOwner",
  });
  const business = await businessModel.create({
    owner: owner._id,
    name: "Media Test Studio",
    description: "An approved business for media tests.",
    category: categoryId,
    address: "1 Media Street",
    phone: "0501240001",
    workingHours,
    approvalStatus: "approved",
    isActive: true,
  });
  businessId = business._id.toString();
  const ownerLogin = await request(app).post("/auth/login").send({ email: "media_owner_test@gmail.com", password: "123456" });
  ownerToken = ownerLogin.body.accessToken;

  const otherOwner = await userModel.create({
    name: "Media Other Owner",
    email: "media_other_owner_test@gmail.com",
    password: hashedPassword,
    role: "businessOwner",
  });
  await businessModel.create({
    owner: otherOwner._id,
    name: "Media Test Other Studio",
    description: "A separate approved business owned by someone else.",
    category: categoryId,
    address: "2 Media Street",
    phone: "0501240002",
    workingHours,
    approvalStatus: "approved",
    isActive: true,
  });
  const otherOwnerLogin = await request(app).post("/auth/login").send({ email: "media_other_owner_test@gmail.com", password: "123456" });
  otherOwnerToken = otherOwnerLogin.body.accessToken;

  const pendingOwner = await userModel.create({
    name: "Media Pending Owner",
    email: "media_pending_owner_test@gmail.com",
    password: hashedPassword,
    role: "businessOwner",
  });
  const pendingBusiness = await businessModel.create({
    owner: pendingOwner._id,
    name: "Media Test Pending Studio",
    description: "A business that is still pending approval.",
    category: categoryId,
    address: "3 Media Street",
    phone: "0501240003",
    workingHours,
    approvalStatus: "pending",
  });
  pendingBusinessId = pendingBusiness._id.toString();
  const pendingOwnerLogin = await request(app).post("/auth/login").send({ email: "media_pending_owner_test@gmail.com", password: "123456" });
  pendingOwnerToken = pendingOwnerLogin.body.accessToken;
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Media Upload Tests", () => {
  let logoId: string;

  test("Owner can upload a logo", async () => {
    const response = await request(app).post(`/businesses/${businessId}/logo`)
      .set("authorization", "JWT " + ownerToken)
      .attach("file", tinyJpegBuffer, "logo.jpg");
    expect(response.statusCode).toBe(201);
    expect(response.body.data.type).toBe("logo");
    logoId = response.body.data._id;
  });

  test("Uploading another logo replaces the first", async () => {
    const response = await request(app).post(`/businesses/${businessId}/logo`)
      .set("authorization", "JWT " + ownerToken)
      .attach("file", tinyJpegBuffer, "logo2.jpg");
    expect(response.statusCode).toBe(201);
    expect(response.body.data._id).not.toBe(logoId);

    const count = await mediaModel.countDocuments({ business: businessId, type: "logo" });
    expect(count).toBe(1);
  });

  test("Owner can upload a cover image", async () => {
    const response = await request(app).post(`/businesses/${businessId}/cover`)
      .set("authorization", "JWT " + ownerToken)
      .attach("file", tinyJpegBuffer, "cover.jpg");
    expect(response.statusCode).toBe(201);
    expect(response.body.data.type).toBe("cover");
  });

  test("Cover replacement works", async () => {
    await request(app).post(`/businesses/${businessId}/cover`)
      .set("authorization", "JWT " + ownerToken)
      .attach("file", tinyJpegBuffer, "cover2.jpg");
    const count = await mediaModel.countDocuments({ business: businessId, type: "cover" });
    expect(count).toBe(1);
  });

  test("Owner can add portfolio images", async () => {
    const response = await request(app).post(`/businesses/${businessId}/portfolio`)
      .set("authorization", "JWT " + ownerToken)
      .attach("file", tinyJpegBuffer, "portfolio1.jpg");
    expect(response.statusCode).toBe(201);
    expect(response.body.data.type).toBe("portfolio");
  });

  test("Seventh portfolio image is rejected when the limit is 6", async () => {
    // One portfolio image already exists from the previous test - add 5
    // more to reach the cap of 6 total.
    for (let i = 2; i <= 6; i++) {
      const res = await request(app).post(`/businesses/${businessId}/portfolio`)
        .set("authorization", "JWT " + ownerToken)
        .attach("file", tinyJpegBuffer, `portfolio${i}.jpg`);
      expect(res.statusCode).toBe(201);
    }
    const seventh = await request(app).post(`/businesses/${businessId}/portfolio`)
      .set("authorization", "JWT " + ownerToken)
      .attach("file", tinyJpegBuffer, "portfolio7.jpg");
    expect(seventh.statusCode).toBe(400);

    const count = await mediaModel.countDocuments({ business: businessId, type: "portfolio" });
    expect(count).toBe(6);
  });

  test("Wrong MIME type is rejected", async () => {
    const response = await request(app).post(`/businesses/${businessId}/logo`)
      .set("authorization", "JWT " + ownerToken)
      .attach("file", Buffer.from("not an image"), "notanimage.txt");
    expect(response.statusCode).toBe(400);
  });

  test("Oversized image is rejected", async () => {
    const response = await request(app).post(`/businesses/${businessId}/logo`)
      .set("authorization", "JWT " + ownerToken)
      .attach("file", oversizedBuffer, "big.jpg");
    expect(response.statusCode).toBe(400);
  });

  test("Invalid upload field name returns 400, not 500", async () => {
    const response = await request(app).post(`/businesses/${businessId}/logo`)
      .set("authorization", "JWT " + ownerToken)
      .attach("wrongFieldName", tinyJpegBuffer, "logo.jpg");
    expect(response.statusCode).toBe(400);
  });

  test("Non-owner cannot upload media", async () => {
    const response = await request(app).post(`/businesses/${businessId}/logo`)
      .set("authorization", "JWT " + otherOwnerToken)
      .attach("file", tinyJpegBuffer, "logo.jpg");
    expect(response.statusCode).toBe(403);
  });

  test("Customer cannot upload media", async () => {
    const response = await request(app).post(`/businesses/${businessId}/logo`)
      .set("authorization", "JWT " + customerToken)
      .attach("file", tinyJpegBuffer, "logo.jpg");
    expect(response.statusCode).toBe(403);
  });
});

describe("Media Delete Tests", () => {
  let deletableMediaId: string;

  beforeAll(async () => {
    // The portfolio is already at the 6-image cap from the previous
    // describe block - delete one to make room for a fresh, known image to
    // delete in this block, keeping this block self-contained.
    const existing = await mediaModel.findOne({ business: businessId, type: "portfolio" });
    if (existing) {
      await existing.deleteOne();
    }
    const uploadResponse = await request(app).post(`/businesses/${businessId}/portfolio`)
      .set("authorization", "JWT " + ownerToken)
      .attach("file", tinyJpegBuffer, "deletable.jpg");
    deletableMediaId = uploadResponse.body.data._id;
  });

  test("Owner can delete their own portfolio image", async () => {
    const response = await request(app).delete(`/businesses/${businessId}/portfolio/${deletableMediaId}`)
      .set("authorization", "JWT " + ownerToken);
    expect(response.statusCode).toBe(200);

    const stillExists = await mediaModel.findById(deletableMediaId);
    expect(stillExists).toBeNull();
  });

  test("Owner cannot delete another business's media", async () => {
    const anotherUpload = await request(app).post(`/businesses/${businessId}/portfolio`)
      .set("authorization", "JWT " + ownerToken)
      .attach("file", tinyJpegBuffer, "another.jpg");
    const mediaId = anotherUpload.body.data._id;

    const response = await request(app).delete(`/businesses/${businessId}/portfolio/${mediaId}`)
      .set("authorization", "JWT " + otherOwnerToken);
    expect(response.statusCode).toBe(403);
  });
});

describe("Media Metadata and Bytes Tests", () => {
  test("GET /media/business/:id returns metadata only", async () => {
    const response = await request(app).get(`/media/business/${businessId}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    for (const item of response.body.data) {
      expect(item.data).toBeUndefined();
      expect(item.contentType).toBeDefined();
    }
  });

  test("GET /media/:id serves correct Content-Type and bytes", async () => {
    const logo = await mediaModel.findOne({ business: businessId, type: "logo" });
    const response = await request(app).get(`/media/${logo!._id}`).buffer(true);
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("image/jpeg");
    expect(response.body.length).toBeGreaterThan(0);
  });

  test("Approved+active business media is public", async () => {
    const response = await request(app).get(`/media/business/${businessId}`);
    expect(response.statusCode).toBe(200);
  });

  test("Private/pending business media is not publicly exposed", async () => {
    const response = await request(app).get(`/media/business/${pendingBusinessId}`);
    expect(response.statusCode).toBe(404);
  });

  test("Owner can view their own private business media", async () => {
    await request(app).post(`/businesses/${pendingBusinessId}/logo`)
      .set("authorization", "JWT " + pendingOwnerToken)
      .attach("file", tinyJpegBuffer, "pending-logo.jpg");

    const response = await request(app).get(`/media/business/${pendingBusinessId}`)
      .set("authorization", "JWT " + pendingOwnerToken);
    expect(response.statusCode).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  test("A nonexistent media id returns 404", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const response = await request(app).get(`/media/${fakeId}`);
    expect(response.statusCode).toBe(404);
  });

  test("Unrelated user cannot fetch private business media bytes", async () => {
    const pendingLogo = await mediaModel.findOne({ business: pendingBusinessId, type: "logo" });
    const response = await request(app).get(`/media/${pendingLogo!._id}`)
      .set("authorization", "JWT " + otherOwnerToken);
    expect(response.statusCode).toBe(404);
  });
});
