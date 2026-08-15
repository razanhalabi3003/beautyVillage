import request from "supertest";
import initApp from "../server";
import mongoose from "mongoose";
import { Express } from "express";
import userModel from "../models/user_model";
import categoryModel from "../models/category_model";
import businessModel from "../models/business_model";
import serviceModel from "../models/service_model";
import appointmentModel from "../models/appointment_model";
import reviewModel from "../models/review_model";
import bcrypt from "bcrypt";

let app: Express;

// This file creates many users/businesses/appointments (each with bcrypt
// hashing) - legitimately slower than the default 5s hook timeout, and
// slower still under the combined load of the full test suite.
jest.setTimeout(60000);

const hashPassword = async (password: string) => bcrypt.hash(password, await bcrypt.genSalt(10));

const adminUser = { name: "Review Admin", email: "review_admin_test@gmail.com", password: "123456" };
const customerUser = { name: "Review Customer", email: "review_customer_test@gmail.com", password: "123456" };
const otherCustomerUser = { name: "Review Other Customer", email: "review_other_customer_test@gmail.com", password: "123456" };

let adminToken: string;
let customerToken: string;
let customerId: string;
let otherCustomerToken: string;
let otherCustomerId: string;
let categoryId: string;

let mainOwnerToken: string;
let mainOwnerId: string;
let mainBusinessId: string;
let mainServiceId: string;

let elsewhereOwnerToken: string;
let elsewhereOwnerId: string;

beforeAll(async () => {
  app = await initApp();

  await userModel.deleteMany({
    email: {
      $in: [
        adminUser.email,
        customerUser.email,
        otherCustomerUser.email,
        "review_main_owner_test@gmail.com",
        "review_elsewhere_owner_test@gmail.com",
      ],
    },
  });
  await categoryModel.deleteMany({ name: "Review Test Category" });
  await businessModel.deleteMany({ name: { $in: ["Review Main Studio", "Review Elsewhere Studio"] } });

  const hashedPassword = await hashPassword("123456");

  await userModel.create({ name: adminUser.name, email: adminUser.email, password: hashedPassword, role: "admin" });
  const adminLogin = await request(app).post("/auth/login").send({ email: adminUser.email, password: adminUser.password });
  adminToken = adminLogin.body.accessToken;

  await request(app).post("/auth/register").send(customerUser);
  const customerLogin = await request(app).post("/auth/login").send({ email: customerUser.email, password: customerUser.password });
  customerToken = customerLogin.body.accessToken;
  customerId = customerLogin.body._id;

  await request(app).post("/auth/register").send(otherCustomerUser);
  const otherCustomerLogin = await request(app).post("/auth/login").send({ email: otherCustomerUser.email, password: otherCustomerUser.password });
  otherCustomerToken = otherCustomerLogin.body.accessToken;
  otherCustomerId = otherCustomerLogin.body._id;

  const category = await categoryModel.create({ name: "Review Test Category", slug: "review-test-category", isActive: true });
  categoryId = category._id.toString();

  const mainOwner = await userModel.create({
    name: "Review Main Owner",
    email: "review_main_owner_test@gmail.com",
    password: hashedPassword,
    role: "businessOwner",
  });
  mainOwnerId = mainOwner._id.toString();
  const mainBusiness = await businessModel.create({
    owner: mainOwner._id,
    name: "Review Main Studio",
    description: "The main fixture business for review tests.",
    category: categoryId,
    address: "1 Review Street",
    phone: "0501260001",
    approvalStatus: "approved",
    isActive: true,
  });
  mainBusinessId = mainBusiness._id.toString();
  const mainOwnerLogin = await request(app).post("/auth/login").send({ email: "review_main_owner_test@gmail.com", password: "123456" });
  mainOwnerToken = mainOwnerLogin.body.accessToken;

  const mainService = await serviceModel.create({ business: mainBusinessId, name: "Main Review Service", price: 100, durationMinutes: 60, isActive: true });
  mainServiceId = mainService._id.toString();

  const elsewhereOwner = await userModel.create({
    name: "Review Elsewhere Owner",
    email: "review_elsewhere_owner_test@gmail.com",
    password: hashedPassword,
    role: "businessOwner",
  });
  elsewhereOwnerId = elsewhereOwner._id.toString();
  await businessModel.create({
    owner: elsewhereOwner._id,
    name: "Review Elsewhere Studio",
    description: "A separate business, whose owner will book at the main studio as a customer.",
    category: categoryId,
    address: "2 Review Street",
    phone: "0501260002",
    approvalStatus: "approved",
    isActive: true,
  });
  const elsewhereOwnerLogin = await request(app).post("/auth/login").send({ email: "review_elsewhere_owner_test@gmail.com", password: "123456" });
  elsewhereOwnerToken = elsewhereOwnerLogin.body.accessToken;
});

afterAll(async () => {
  await mongoose.connection.close();
});

const makeAppointment = (overrides: Record<string, unknown>) => appointmentModel.create({
  customer: customerId,
  business: mainBusinessId,
  service: mainServiceId,
  startDateTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
  endDateTime: new Date(Date.now() - 60 * 60 * 1000),
  status: "completed",
  ...overrides,
});

describe("Review Creation Tests", () => {
  test("Customer can review their own completed appointment", async () => {
    const appointment = await makeAppointment({});
    const response = await request(app).post("/reviews")
      .set("authorization", "JWT " + customerToken)
      .send({ appointment: appointment._id.toString(), rating: 5, comment: "Great service!" });
    expect(response.statusCode).toBe(201);
    expect(response.body.data.rating).toBe(5);
    expect(response.body.data.customer).toBe(customerId);
    expect(response.body.data.business).toBe(mainBusinessId);
  });

  test("businessOwner-as-customer can review a completed appointment at another business", async () => {
    const appointment = await appointmentModel.create({
      customer: elsewhereOwnerId,
      business: mainBusinessId,
      service: mainServiceId,
      startDateTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      endDateTime: new Date(Date.now() - 60 * 60 * 1000),
      status: "completed",
    });
    const response = await request(app).post("/reviews")
      .set("authorization", "JWT " + elsewhereOwnerToken)
      .send({ appointment: appointment._id.toString(), rating: 4 });
    expect(response.statusCode).toBe(201);
  });

  test("Admin is blocked from creating a review", async () => {
    const appointment = await makeAppointment({});
    const response = await request(app).post("/reviews")
      .set("authorization", "JWT " + adminToken)
      .send({ appointment: appointment._id.toString(), rating: 5 });
    expect(response.statusCode).toBe(403);
  });

  test("Pending appointment cannot be reviewed", async () => {
    const appointment = await makeAppointment({ status: "pending" });
    const response = await request(app).post("/reviews")
      .set("authorization", "JWT " + customerToken)
      .send({ appointment: appointment._id.toString(), rating: 5 });
    expect(response.statusCode).toBe(400);
  });

  test("Confirmed appointment cannot be reviewed", async () => {
    const appointment = await makeAppointment({ status: "confirmed" });
    const response = await request(app).post("/reviews")
      .set("authorization", "JWT " + customerToken)
      .send({ appointment: appointment._id.toString(), rating: 5 });
    expect(response.statusCode).toBe(400);
  });

  test("Cancelled appointment cannot be reviewed", async () => {
    const appointment = await makeAppointment({ status: "cancelled" });
    const response = await request(app).post("/reviews")
      .set("authorization", "JWT " + customerToken)
      .send({ appointment: appointment._id.toString(), rating: 5 });
    expect(response.statusCode).toBe(400);
  });

  test("Rejected appointment cannot be reviewed", async () => {
    const appointment = await makeAppointment({ status: "rejected" });
    const response = await request(app).post("/reviews")
      .set("authorization", "JWT " + customerToken)
      .send({ appointment: appointment._id.toString(), rating: 5 });
    expect(response.statusCode).toBe(400);
  });

  test("Cannot review another customer's appointment", async () => {
    const appointment = await appointmentModel.create({
      customer: otherCustomerId,
      business: mainBusinessId,
      service: mainServiceId,
      startDateTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      endDateTime: new Date(Date.now() - 60 * 60 * 1000),
      status: "completed",
    });
    const response = await request(app).post("/reviews")
      .set("authorization", "JWT " + customerToken)
      .send({ appointment: appointment._id.toString(), rating: 5 });
    expect(response.statusCode).toBe(403);
  });

  test("Owner cannot review their own business, even with an inconsistent appointment", async () => {
    const appointment = await appointmentModel.create({
      customer: mainOwnerId,
      business: mainBusinessId,
      service: mainServiceId,
      startDateTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      endDateTime: new Date(Date.now() - 60 * 60 * 1000),
      status: "completed",
    });
    const response = await request(app).post("/reviews")
      .set("authorization", "JWT " + mainOwnerToken)
      .send({ appointment: appointment._id.toString(), rating: 5 });
    expect(response.statusCode).toBe(403);
  });

  test("One review per appointment - duplicate blocked by the controller", async () => {
    const appointment = await makeAppointment({});
    const first = await request(app).post("/reviews")
      .set("authorization", "JWT " + customerToken)
      .send({ appointment: appointment._id.toString(), rating: 5 });
    expect(first.statusCode).toBe(201);

    const second = await request(app).post("/reviews")
      .set("authorization", "JWT " + customerToken)
      .send({ appointment: appointment._id.toString(), rating: 3 });
    expect(second.statusCode).toBe(400);
  });

  test("Duplicate review is also blocked at the database level", async () => {
    const appointment = await makeAppointment({});
    await reviewModel.create({ customer: customerId, business: mainBusinessId, appointment: appointment._id, rating: 5 });

    await expect(
      reviewModel.create({ customer: customerId, business: mainBusinessId, appointment: appointment._id, rating: 3 })
    ).rejects.toThrow();
  });

  test("Rating below 1 is rejected", async () => {
    const appointment = await makeAppointment({});
    const response = await request(app).post("/reviews")
      .set("authorization", "JWT " + customerToken)
      .send({ appointment: appointment._id.toString(), rating: 0 });
    expect(response.statusCode).toBe(400);
  });

  test("Rating above 5 is rejected", async () => {
    const appointment = await makeAppointment({});
    const response = await request(app).post("/reviews")
      .set("authorization", "JWT " + customerToken)
      .send({ appointment: appointment._id.toString(), rating: 6 });
    expect(response.statusCode).toBe(400);
  });

  test("Non-integer rating is rejected", async () => {
    const appointment = await makeAppointment({});
    const response = await request(app).post("/reviews")
      .set("authorization", "JWT " + customerToken)
      .send({ appointment: appointment._id.toString(), rating: 3.5 });
    expect(response.statusCode).toBe(400);
  });

  test("Client cannot inject customer", async () => {
    const appointment = await makeAppointment({});
    const response = await request(app).post("/reviews")
      .set("authorization", "JWT " + customerToken)
      .send({ appointment: appointment._id.toString(), rating: 5, customer: otherCustomerId });
    expect(response.statusCode).toBe(400);
  });

  test("Client cannot inject business", async () => {
    const appointment = await makeAppointment({});
    const response = await request(app).post("/reviews")
      .set("authorization", "JWT " + customerToken)
      .send({ appointment: appointment._id.toString(), rating: 5, business: mainBusinessId });
    expect(response.statusCode).toBe(400);
  });

  test("Client cannot inject isVisible", async () => {
    const appointment = await makeAppointment({});
    const response = await request(app).post("/reviews")
      .set("authorization", "JWT " + customerToken)
      .send({ appointment: appointment._id.toString(), rating: 5, isVisible: false });
    expect(response.statusCode).toBe(400);
  });

  test("A comment over the max length is rejected", async () => {
    const appointment = await makeAppointment({});
    const response = await request(app).post("/reviews")
      .set("authorization", "JWT " + customerToken)
      .send({ appointment: appointment._id.toString(), rating: 5, comment: "x".repeat(501) });
    expect(response.statusCode).toBe(400);
  });

  test("A review can still be created if the business was later suspended", async () => {
    // Clean up this test's own fixtures first, so re-running this file
    // against the same beautyVillage_test database doesn't hit a duplicate
    // -email error from a previous run.
    await userModel.deleteMany({ email: "review_suspendable_owner_test@gmail.com" });
    await businessModel.deleteMany({ name: "Review Suspendable Studio" });

    const suspendableOwner = await userModel.create({
      name: "Review Suspendable Owner",
      email: "review_suspendable_owner_test@gmail.com",
      password: await hashPassword("123456"),
      role: "businessOwner",
    });
    const suspendableBusiness = await businessModel.create({
      owner: suspendableOwner._id,
      name: "Review Suspendable Studio",
      description: "A business that will be suspended after the appointment completes.",
      category: categoryId,
      address: "3 Review Street",
      phone: "0501260003",
      approvalStatus: "approved",
      isActive: true,
    });
    const suspendableService = await serviceModel.create({ business: suspendableBusiness._id, name: "Suspendable Service", price: 50, durationMinutes: 30, isActive: true });
    const appointment = await appointmentModel.create({
      customer: customerId,
      business: suspendableBusiness._id,
      service: suspendableService._id,
      startDateTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      endDateTime: new Date(Date.now() - 60 * 60 * 1000),
      status: "completed",
    });

    // Suspend the business after the appointment already completed.
    await businessModel.findByIdAndUpdate(suspendableBusiness._id, { isActive: false });

    const response = await request(app).post("/reviews")
      .set("authorization", "JWT " + customerToken)
      .send({ appointment: appointment._id.toString(), rating: 4 });
    expect(response.statusCode).toBe(201);
  });
});

describe("Rating Calculation Tests", () => {
  let ratingBusinessId: string;
  let ratingServiceId: string;
  const reviewers: { token: string; id: string }[] = [];

  beforeAll(async () => {
    await businessModel.deleteMany({ name: "Rating Calculation Studio" });
    await userModel.deleteMany({
      email: { $in: ["rating_owner_test@gmail.com", "rating_customer_1_test@gmail.com", "rating_customer_2_test@gmail.com", "rating_customer_3_test@gmail.com"] },
    });

    const owner = await userModel.create({
      name: "Rating Owner",
      email: "rating_owner_test@gmail.com",
      password: await hashPassword("123456"),
      role: "businessOwner",
    });
    const business = await businessModel.create({
      owner: owner._id,
      name: "Rating Calculation Studio",
      description: "A dedicated business for testing rating recalculation.",
      category: categoryId,
      address: "4 Review Street",
      phone: "0501260004",
      approvalStatus: "approved",
      isActive: true,
    });
    ratingBusinessId = business._id.toString();
    const service = await serviceModel.create({ business: ratingBusinessId, name: "Rating Service", price: 40, durationMinutes: 30, isActive: true });
    ratingServiceId = service._id.toString();

    for (let i = 1; i <= 3; i++) {
      const email = `rating_customer_${i}_test@gmail.com`;
      await request(app).post("/auth/register").send({ name: `Rating Customer ${i}`, email, password: "123456" });
      const login = await request(app).post("/auth/login").send({ email, password: "123456" });
      reviewers.push({ token: login.body.accessToken, id: login.body._id });
    }
  });

  const completedAppointmentFor = (customerIdForAppt: string) => appointmentModel.create({
    customer: customerIdForAppt,
    business: ratingBusinessId,
    service: ratingServiceId,
    startDateTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
    endDateTime: new Date(Date.now() - 60 * 60 * 1000),
    status: "completed",
  });

  test("First review sets averageRating and reviewCount correctly", async () => {
    const appointment = await completedAppointmentFor(reviewers[0].id);
    await request(app).post("/reviews")
      .set("authorization", "JWT " + reviewers[0].token)
      .send({ appointment: appointment._id.toString(), rating: 5 });

    const business = await businessModel.findById(ratingBusinessId);
    expect(business?.averageRating).toBe(5);
    expect(business?.reviewCount).toBe(1);
  });

  let thirdReviewId: string;

  test("Multiple reviews calculate a correctly rounded average", async () => {
    const appointment2 = await completedAppointmentFor(reviewers[1].id);
    await request(app).post("/reviews")
      .set("authorization", "JWT " + reviewers[1].token)
      .send({ appointment: appointment2._id.toString(), rating: 5 });

    const appointment3 = await completedAppointmentFor(reviewers[2].id);
    const thirdReview = await request(app).post("/reviews")
      .set("authorization", "JWT " + reviewers[2].token)
      .send({ appointment: appointment3._id.toString(), rating: 4 });
    thirdReviewId = thirdReview.body.data._id;

    // Ratings: 5, 5, 4 -> average 14/3 = 4.6666... -> rounds to 4.7
    const business = await businessModel.findById(ratingBusinessId);
    expect(business?.averageRating).toBe(4.7);
    expect(business?.reviewCount).toBe(3);
  });

  test("Hiding a review excludes it from the calculation", async () => {
    await request(app).put(`/reviews/${thirdReviewId}/visibility`)
      .set("authorization", "JWT " + adminToken)
      .send({ isVisible: false });

    const business = await businessModel.findById(ratingBusinessId);
    expect(business?.averageRating).toBe(5);
    expect(business?.reviewCount).toBe(2);
  });

  test("Restoring a review includes it again", async () => {
    await request(app).put(`/reviews/${thirdReviewId}/visibility`)
      .set("authorization", "JWT " + adminToken)
      .send({ isVisible: true });

    const business = await businessModel.findById(ratingBusinessId);
    expect(business?.averageRating).toBe(4.7);
    expect(business?.reviewCount).toBe(3);
  });

  test("Zero visible reviews resets averageRating and reviewCount to 0", async () => {
    // Clean up this test's own fixtures first, so re-running this file
    // against the same beautyVillage_test database doesn't hit a duplicate
    // -email error from a previous run.
    await userModel.deleteMany({ email: "solo_rating_owner_test@gmail.com" });
    await businessModel.deleteMany({ name: "Solo Rating Studio" });

    const soloOwner = await userModel.create({
      name: "Solo Rating Owner",
      email: "solo_rating_owner_test@gmail.com",
      password: await hashPassword("123456"),
      role: "businessOwner",
    });
    const soloBusiness = await businessModel.create({
      owner: soloOwner._id,
      name: "Solo Rating Studio",
      description: "A business with exactly one review, later hidden.",
      category: categoryId,
      address: "5 Review Street",
      phone: "0501260005",
      approvalStatus: "approved",
      isActive: true,
    });
    const soloService = await serviceModel.create({ business: soloBusiness._id, name: "Solo Service", price: 30, durationMinutes: 20, isActive: true });
    const soloAppointment = await appointmentModel.create({
      customer: customerId,
      business: soloBusiness._id,
      service: soloService._id,
      startDateTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      endDateTime: new Date(Date.now() - 60 * 60 * 1000),
      status: "completed",
    });
    const soloReview = await request(app).post("/reviews")
      .set("authorization", "JWT " + customerToken)
      .send({ appointment: soloAppointment._id.toString(), rating: 3 });

    let business = await businessModel.findById(soloBusiness._id);
    expect(business?.averageRating).toBe(3);
    expect(business?.reviewCount).toBe(1);

    await request(app).put(`/reviews/${soloReview.body.data._id}/visibility`)
      .set("authorization", "JWT " + adminToken)
      .send({ isVisible: false });

    business = await businessModel.findById(soloBusiness._id);
    expect(business?.averageRating).toBe(0);
    expect(business?.reviewCount).toBe(0);
  });
});

describe("Public Review Listing Tests", () => {
  let listingBusinessId: string;
  let visibleReviewName: string;
  let hiddenReviewId: string;
  let privateBusinessId: string;
  let privateOwnerToken: string;

  beforeAll(async () => {
    await businessModel.deleteMany({ name: { $in: ["Listing Test Studio", "Listing Private Studio"] } });
    await userModel.deleteMany({
      email: { $in: ["listing_owner_test@gmail.com", "listing_customer_1_test@gmail.com", "listing_customer_2_test@gmail.com", "listing_private_owner_test@gmail.com"] },
    });

    const owner = await userModel.create({
      name: "Listing Owner",
      email: "listing_owner_test@gmail.com",
      password: await hashPassword("123456"),
      role: "businessOwner",
    });
    const business = await businessModel.create({
      owner: owner._id,
      name: "Listing Test Studio",
      description: "A dedicated business for testing the public review list.",
      category: categoryId,
      address: "6 Review Street",
      phone: "0501260006",
      approvalStatus: "approved",
      isActive: true,
    });
    listingBusinessId = business._id.toString();
    const service = await serviceModel.create({ business: listingBusinessId, name: "Listing Service", price: 40, durationMinutes: 30, isActive: true });

    const c1email = "listing_customer_1_test@gmail.com";
    await request(app).post("/auth/register").send({ name: "Listing Customer One", email: c1email, password: "123456" });
    const c1Login = await request(app).post("/auth/login").send({ email: c1email, password: "123456" });
    const c1Appointment = await appointmentModel.create({
      customer: c1Login.body._id,
      business: listingBusinessId,
      service: service._id,
      startDateTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
      endDateTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
      status: "completed",
    });
    const visibleReview = await request(app).post("/reviews")
      .set("authorization", "JWT " + c1Login.body.accessToken)
      .send({ appointment: c1Appointment._id.toString(), rating: 5, comment: "Loved it" });
    visibleReviewName = visibleReview.body.data._id;

    const c2email = "listing_customer_2_test@gmail.com";
    await request(app).post("/auth/register").send({ name: "Listing Customer Two", email: c2email, password: "123456" });
    const c2Login = await request(app).post("/auth/login").send({ email: c2email, password: "123456" });
    const c2Appointment = await appointmentModel.create({
      customer: c2Login.body._id,
      business: listingBusinessId,
      service: service._id,
      startDateTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      endDateTime: new Date(Date.now() - 60 * 60 * 1000),
      status: "completed",
    });
    const hiddenReview = await request(app).post("/reviews")
      .set("authorization", "JWT " + c2Login.body.accessToken)
      .send({ appointment: c2Appointment._id.toString(), rating: 1, comment: "Hidden one" });
    hiddenReviewId = hiddenReview.body.data._id;

    // Re-login: the top-level adminToken can have expired by this point in a
    // long-running file (.env_test's TOKEN_EXPIRATION vs. total runtime) -
    // an expired token here would make this PUT fail silently (its response
    // is otherwise unchecked) and leave hiddenReviewId still visible.
    const freshAdminLoginForHide = await request(app).post("/auth/login").send({ email: adminUser.email, password: adminUser.password });
    adminToken = freshAdminLoginForHide.body.accessToken;

    const hideResponse = await request(app).put(`/reviews/${hiddenReviewId}/visibility`)
      .set("authorization", "JWT " + adminToken)
      .send({ isVisible: false });
    if (hideResponse.statusCode !== 200) {
      throw new Error(`Failed to hide fixture review in beforeAll: expected 200, got ${hideResponse.statusCode} (${JSON.stringify(hideResponse.body)})`);
    }

    // A private (pending) business with a review attached directly, to test
    // the visibility-strategy behavior.
    const privateOwner = await userModel.create({
      name: "Listing Private Owner",
      email: "listing_private_owner_test@gmail.com",
      password: await hashPassword("123456"),
      role: "businessOwner",
    });
    const privateBusiness = await businessModel.create({
      owner: privateOwner._id,
      name: "Listing Private Studio",
      description: "A pending business with a review, for visibility-rule testing.",
      category: categoryId,
      address: "7 Review Street",
      phone: "0501260007",
      approvalStatus: "pending",
    });
    privateBusinessId = privateBusiness._id.toString();
    const privateOwnerLogin = await request(app).post("/auth/login").send({ email: "listing_private_owner_test@gmail.com", password: "123456" });
    privateOwnerToken = privateOwnerLogin.body.accessToken;
    await reviewModel.create({
      customer: customerId,
      business: privateBusinessId,
      appointment: new mongoose.Types.ObjectId(),
      rating: 5,
    });
  });

  test("Visible reviews are returned", async () => {
    const response = await request(app).get(`/reviews/business/${listingBusinessId}`);
    expect(response.statusCode).toBe(200);
    const ids = response.body.data.map((r: { _id: string }) => r._id);
    expect(ids).toContain(visibleReviewName);
  });

  test("Hidden reviews are excluded", async () => {
    const response = await request(app).get(`/reviews/business/${listingBusinessId}`);
    const ids = response.body.data.map((r: { _id: string }) => r._id);
    expect(ids).not.toContain(hiddenReviewId);
  });

  test("Only safe customer fields are exposed", async () => {
    const response = await request(app).get(`/reviews/business/${listingBusinessId}`);
    for (const review of response.body.data) {
      expect(review.customer.password).toBeUndefined();
      expect(review.customer.email).toBeUndefined();
      expect(review.customer.refreshTokens).toBeUndefined();
      expect(review.customer.name).toBeDefined();
    }
  });

  test("Reviews are sorted newest first", async () => {
    const response = await request(app).get(`/reviews/business/${listingBusinessId}`);
    const dates = response.body.data.map((r: { createdAt: string }) => new Date(r.createdAt).getTime());
    const sortedDates = [...dates].sort((a, b) => b - a);
    expect(dates).toEqual(sortedDates);
  });

  test("Pagination metadata is present", async () => {
    const response = await request(app).get(`/reviews/business/${listingBusinessId}?page=1&limit=1`);
    expect(response.body.pagination.page).toBe(1);
    expect(response.body.pagination.limit).toBe(1);
    expect(response.body.data.length).toBeLessThanOrEqual(1);
  });

  test("A private business's reviews are hidden from a guest", async () => {
    const response = await request(app).get(`/reviews/business/${privateBusinessId}`);
    expect(response.statusCode).toBe(404);
  });

  test("The owner can see their own private business's reviews", async () => {
    const response = await request(app).get(`/reviews/business/${privateBusinessId}`)
      .set("authorization", "JWT " + privateOwnerToken);
    expect(response.statusCode).toBe(200);
  });

  test("Admin can see a private business's reviews too", async () => {
    // Re-login: the top-level adminToken can have expired by this point in
    // a long-running file (.env_test's TOKEN_EXPIRATION vs. total runtime).
    const freshAdminLogin = await request(app).post("/auth/login").send({ email: adminUser.email, password: adminUser.password });
    adminToken = freshAdminLogin.body.accessToken;

    const response = await request(app).get(`/reviews/business/${privateBusinessId}`)
      .set("authorization", "JWT " + adminToken);
    expect(response.statusCode).toBe(200);
  });
});

describe("Admin Review Moderation Tests", () => {
  let moderationReviewId: string;

  beforeAll(async () => {
    // Re-login: top-level tokens can have expired by this point in a long
    // -running file (.env_test's TOKEN_EXPIRATION vs. total runtime) - this
    // describe needs all three fresh for the tests below.
    const freshCustomerLogin = await request(app).post("/auth/login").send({ email: customerUser.email, password: customerUser.password });
    customerToken = freshCustomerLogin.body.accessToken;
    const freshAdminLogin = await request(app).post("/auth/login").send({ email: adminUser.email, password: adminUser.password });
    adminToken = freshAdminLogin.body.accessToken;
    const freshOwnerLogin = await request(app).post("/auth/login").send({ email: "review_main_owner_test@gmail.com", password: "123456" });
    mainOwnerToken = freshOwnerLogin.body.accessToken;

    const appointment = await makeAppointment({});
    const review = await request(app).post("/reviews")
      .set("authorization", "JWT " + customerToken)
      .send({ appointment: appointment._id.toString(), rating: 2, comment: "For moderation tests" });
    moderationReviewId = review.body.data._id;
  });

  test("Customer is blocked from the moderation list", async () => {
    const response = await request(app).get("/reviews/admin")
      .set("authorization", "JWT " + customerToken);
    expect(response.statusCode).toBe(403);
  });

  test("Admin can list visible and hidden reviews", async () => {
    const response = await request(app).get("/reviews/admin")
      .set("authorization", "JWT " + adminToken);
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test("The visibility filter works", async () => {
    const response = await request(app).get("/reviews/admin?isVisible=false")
      .set("authorization", "JWT " + adminToken);
    expect(response.statusCode).toBe(200);
    for (const review of response.body.data) {
      expect(review.isVisible).toBe(false);
    }
  });

  test("Admin can hide a review, and it recalculates the rating", async () => {
    const businessBefore = await businessModel.findById(mainBusinessId);
    const countBefore = businessBefore?.reviewCount ?? 0;

    const response = await request(app).put(`/reviews/${moderationReviewId}/visibility`)
      .set("authorization", "JWT " + adminToken)
      .send({ isVisible: false });
    expect(response.statusCode).toBe(200);
    expect(response.body.data.isVisible).toBe(false);

    const businessAfter = await businessModel.findById(mainBusinessId);
    expect(businessAfter?.reviewCount).toBe(countBefore - 1);
  });

  test("Admin can restore a review, and it recalculates the rating again", async () => {
    const businessBefore = await businessModel.findById(mainBusinessId);
    const countBefore = businessBefore?.reviewCount ?? 0;

    const response = await request(app).put(`/reviews/${moderationReviewId}/visibility`)
      .set("authorization", "JWT " + adminToken)
      .send({ isVisible: true });
    expect(response.statusCode).toBe(200);
    expect(response.body.data.isVisible).toBe(true);

    const businessAfter = await businessModel.findById(mainBusinessId);
    expect(businessAfter?.reviewCount).toBe(countBefore + 1);
  });

  test("Non-admin cannot change review visibility", async () => {
    const response = await request(app).put(`/reviews/${moderationReviewId}/visibility`)
      .set("authorization", "JWT " + mainOwnerToken)
      .send({ isVisible: false });
    expect(response.statusCode).toBe(403);
  });
});

describe("GET /reviews/mine Tests", () => {
  let mineCustomerToken: string;
  let mineCustomerId: string;
  let otherMineCustomerToken: string;
  let mineBusinessId: string;
  let mineServiceId: string;
  let visibleMineReviewId: string;
  let hiddenMineReviewId: string;
  let ownerAsCustomerReviewId: string;

  beforeAll(async () => {
    await businessModel.deleteMany({ name: "Mine Reviews Studio" });
    await userModel.deleteMany({
      email: { $in: ["mine_customer_test@gmail.com", "mine_other_customer_test@gmail.com", "mine_owner_test@gmail.com"] },
    });

    const owner = await userModel.create({
      name: "Mine Reviews Owner",
      email: "mine_owner_test@gmail.com",
      password: await hashPassword("123456"),
      role: "businessOwner",
    });
    const business = await businessModel.create({
      owner: owner._id,
      name: "Mine Reviews Studio",
      description: "A dedicated business for testing GET /reviews/mine.",
      category: categoryId,
      address: "8 Review Street",
      phone: "0501260008",
      approvalStatus: "approved",
      isActive: true,
    });
    mineBusinessId = business._id.toString();
    const service = await serviceModel.create({ business: mineBusinessId, name: "Mine Reviews Service", price: 40, durationMinutes: 30, isActive: true });
    mineServiceId = service._id.toString();

    const c1email = "mine_customer_test@gmail.com";
    await request(app).post("/auth/register").send({ name: "Mine Customer", email: c1email, password: "123456" });
    const c1Login = await request(app).post("/auth/login").send({ email: c1email, password: "123456" });
    mineCustomerToken = c1Login.body.accessToken;
    mineCustomerId = c1Login.body._id;

    const c2email = "mine_other_customer_test@gmail.com";
    await request(app).post("/auth/register").send({ name: "Mine Other Customer", email: c2email, password: "123456" });
    const c2Login = await request(app).post("/auth/login").send({ email: c2email, password: "123456" });
    otherMineCustomerToken = c2Login.body.accessToken;

    // Two completed appointments/reviews for the main test customer - one
    // stays visible, one gets hidden by an admin afterwards.
    const visibleAppointment = await appointmentModel.create({
      customer: mineCustomerId,
      business: mineBusinessId,
      service: mineServiceId,
      startDateTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
      endDateTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
      status: "completed",
    });
    const visibleReview = await request(app).post("/reviews")
      .set("authorization", "JWT " + mineCustomerToken)
      .send({ appointment: visibleAppointment._id.toString(), rating: 5, comment: "Great" });
    visibleMineReviewId = visibleReview.body.data._id;

    const hiddenAppointment = await appointmentModel.create({
      customer: mineCustomerId,
      business: mineBusinessId,
      service: mineServiceId,
      startDateTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      endDateTime: new Date(Date.now() - 60 * 60 * 1000),
      status: "completed",
    });
    const hiddenReview = await request(app).post("/reviews")
      .set("authorization", "JWT " + mineCustomerToken)
      .send({ appointment: hiddenAppointment._id.toString(), rating: 2, comment: "Will be hidden" });
    hiddenMineReviewId = hiddenReview.body.data._id;

    // Re-login: top-level tokens can have expired by this point in a
    // long-running file (.env_test's TOKEN_EXPIRATION vs. total runtime).
    const freshAdminLogin = await request(app).post("/auth/login").send({ email: adminUser.email, password: adminUser.password });
    adminToken = freshAdminLogin.body.accessToken;
    const freshElsewhereOwnerLogin = await request(app).post("/auth/login").send({ email: "review_elsewhere_owner_test@gmail.com", password: "123456" });
    elsewhereOwnerToken = freshElsewhereOwnerLogin.body.accessToken;

    const hideResponse = await request(app).put(`/reviews/${hiddenMineReviewId}/visibility`)
      .set("authorization", "JWT " + adminToken)
      .send({ isVisible: false });
    if (hideResponse.statusCode !== 200) {
      throw new Error(`Failed to hide fixture review in beforeAll: expected 200, got ${hideResponse.statusCode} (${JSON.stringify(hideResponse.body)})`);
    }

    // businessOwner-as-customer: elsewhereOwner (from the top-level
    // fixtures) reviews the main studio, to confirm a businessOwner acting
    // as a customer gets their own review back from /reviews/mine too.
    const ownerAsCustomerAppointment = await appointmentModel.create({
      customer: elsewhereOwnerId,
      business: mainBusinessId,
      service: mainServiceId,
      startDateTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      endDateTime: new Date(Date.now() - 60 * 60 * 1000),
      status: "completed",
    });
    const ownerAsCustomerReview = await request(app).post("/reviews")
      .set("authorization", "JWT " + elsewhereOwnerToken)
      .send({ appointment: ownerAsCustomerAppointment._id.toString(), rating: 4 });
    ownerAsCustomerReviewId = ownerAsCustomerReview.body.data._id;
  });

  test("Customer can retrieve their own reviews", async () => {
    const response = await request(app).get("/reviews/mine")
      .set("authorization", "JWT " + mineCustomerToken);
    expect(response.statusCode).toBe(200);
    const ids = response.body.data.map((r: { _id: string }) => r._id);
    expect(ids).toContain(visibleMineReviewId);
    expect(ids).toContain(hiddenMineReviewId);
  });

  test("Another user's reviews are not returned", async () => {
    const response = await request(app).get("/reviews/mine")
      .set("authorization", "JWT " + otherMineCustomerToken);
    expect(response.statusCode).toBe(200);
    const ids = response.body.data.map((r: { _id: string }) => r._id);
    expect(ids).not.toContain(visibleMineReviewId);
    expect(ids).not.toContain(hiddenMineReviewId);
  });

  test("A hidden review is still returned in /reviews/mine", async () => {
    const response = await request(app).get("/reviews/mine")
      .set("authorization", "JWT " + mineCustomerToken);
    const hiddenEntry = response.body.data.find((r: { _id: string }) => r._id === hiddenMineReviewId);
    expect(hiddenEntry).toBeDefined();
    expect(hiddenEntry.isVisible).toBe(false);
  });

  test("businessOwner acting as customer can retrieve their own reviews", async () => {
    const response = await request(app).get("/reviews/mine")
      .set("authorization", "JWT " + elsewhereOwnerToken);
    expect(response.statusCode).toBe(200);
    const ids = response.body.data.map((r: { _id: string }) => r._id);
    expect(ids).toContain(ownerAsCustomerReviewId);
  });

  test("Unauthenticated request is rejected", async () => {
    const response = await request(app).get("/reviews/mine");
    expect(response.statusCode).toBe(401);
  });

  test("Admin is blocked from /reviews/mine - it does not need this endpoint", async () => {
    const response = await request(app).get("/reviews/mine")
      .set("authorization", "JWT " + adminToken);
    expect(response.statusCode).toBe(403);
  });

  test("Response includes only the documented safe fields", async () => {
    const response = await request(app).get("/reviews/mine")
      .set("authorization", "JWT " + mineCustomerToken);
    for (const review of response.body.data) {
      expect(review.appointment).toBeDefined();
      expect(review.business).toBeDefined();
      expect(review.rating).toBeDefined();
      expect(review.isVisible).toBeDefined();
      expect(review.createdAt).toBeDefined();
      expect(review.customer).toBeUndefined();
    }
  });
});
