import request from "supertest";
import initApp from "../server";
import mongoose from "mongoose";
import { Express } from "express";
import userModel from "../models/user_model";
import categoryModel from "../models/category_model";
import businessModel from "../models/business_model";
import serviceModel from "../models/service_model";
import appointmentModel from "../models/appointment_model";
import bcrypt from "bcrypt";
import { getIsraelDateParts } from "../utils/appointmentUtils";

let app: Express;

// This file creates many users/businesses/services (each with bcrypt
// hashing) - legitimately slower than the default 5s hook timeout, and
// slower still under the combined load of the full test suite.
jest.setTimeout(60000);

// Anchor 14 days in the future (using setUTCHours, not setHours, so this is
// independent of whatever timezone the machine running the tests is in),
// then ask the same Israel-local helper the production code uses what day/
// time that actually is. This lets tests build precise, deterministic
// working-hours fixtures without guessing "today" or risking a past-time
// false positive.
const anchor = new Date();
anchor.setUTCDate(anchor.getUTCDate() + 14);
anchor.setUTCHours(9, 0, 0, 0); // safely mid-morning in Israel local time, far from midnight
const anchorParts = getIsraelDateParts(anchor);

const addMinutesToHHMM = (hhmm: string, minutesToAdd: number): string => {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutesToAdd;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
};

const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60000);

// For tests that just need "some distinct future slot" (not testing precise
// relative timing), this is safer than addMinutes(new Date(), largeNumber):
// a large minute offset shifts the time-of-day unpredictably as real time
// passes, and can drift into landing near Israel-local midnight on any given
// day the suite happens to run - which isWithinWorkingHours correctly (and
// intentionally) rejects as an overnight appointment. Anchoring by whole
// days at a fixed safe UTC hour (like the shared `anchor` above) avoids that
// entirely, regardless of what day/time the suite actually runs.
const safeFutureDateTime = (daysFromNow: number): Date => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  date.setUTCHours(9, 0, 0, 0);
  return date;
};

const fullyOpenWorkingHours = Array.from({ length: 7 }, (_, day) => ({
  day,
  isOpen: true,
  startTime: "00:00",
  endTime: "23:59",
}));

const narrowWorkingHours = [
  {
    day: anchorParts.dayOfWeek,
    isOpen: true,
    startTime: anchorParts.hhmm,
    endTime: addMinutesToHHMM(anchorParts.hhmm, 120),
  },
];

const adminUser = { name: "Appt Admin", email: "appt_admin_test@gmail.com", password: "123456" };
const customerUser = { name: "Appt Customer", email: "appt_customer_test@gmail.com", password: "123456" };

let adminToken: string;
let customerToken: string;
let customerId: string;
let categoryId: string;

let mainOwnerToken: string;
let mainOwnerId: string;
let mainBusinessId: string;
let mainServiceId: string;
let mainInactiveServiceId: string;

let elsewhereOwnerToken: string;
let elsewhereBusinessId: string;
let elsewhereServiceId: string;

let pendingBusinessId: string;
let pendingServiceId: string;

let rejectedBusinessId: string;
let rejectedServiceId: string;

let suspendedBusinessId: string;
let suspendedServiceId: string;

let narrowBusinessId: string;
let narrowServiceId: string;

const hashPassword = async (password: string) => bcrypt.hash(password, await bcrypt.genSalt(10));

beforeAll(async () => {
  app = await initApp();

  await userModel.deleteMany({
    email: {
      $in: [
        adminUser.email,
        customerUser.email,
        "appt_main_owner_test@gmail.com",
        "appt_elsewhere_owner_test@gmail.com",
        "appt_pending_owner_test@gmail.com",
        "appt_rejected_owner_test@gmail.com",
        "appt_suspended_owner_test@gmail.com",
        "appt_narrow_owner_test@gmail.com",
      ],
    },
  });
  await categoryModel.deleteMany({ name: "Appointment Test Category" });
  await businessModel.deleteMany({
    name: {
      $in: [
        "Appt Main Studio",
        "Appt Elsewhere Studio",
        "Appt Pending Studio",
        "Appt Rejected Studio",
        "Appt Suspended Studio",
        "Appt Narrow Studio",
      ],
    },
  });

  const hashedPassword = await hashPassword("123456");

  await userModel.create({ name: adminUser.name, email: adminUser.email, password: hashedPassword, role: "admin" });
  const adminLogin = await request(app).post("/auth/login").send({ email: adminUser.email, password: adminUser.password });
  adminToken = adminLogin.body.accessToken;

  await request(app).post("/auth/register").send(customerUser);
  const customerLogin = await request(app).post("/auth/login").send({ email: customerUser.email, password: customerUser.password });
  customerToken = customerLogin.body.accessToken;
  customerId = customerLogin.body._id;

  const category = await categoryModel.create({ name: "Appointment Test Category", slug: "appointment-test-category", isActive: true });
  categoryId = category._id.toString();

  // Main fixture: approved, active, open every day all day.
  const mainOwner = await userModel.create({
    name: "Appt Main Owner",
    email: "appt_main_owner_test@gmail.com",
    password: hashedPassword,
    role: "businessOwner",
  });
  mainOwnerId = mainOwner._id.toString();
  const mainBusiness = await businessModel.create({
    owner: mainOwner._id,
    name: "Appt Main Studio",
    description: "The main fixture business for appointment tests.",
    category: categoryId,
    address: "1 Appt Street",
    phone: "0501250001",
    workingHours: fullyOpenWorkingHours,
    approvalStatus: "approved",
    isActive: true,
  });
  mainBusinessId = mainBusiness._id.toString();
  const mainOwnerLogin = await request(app).post("/auth/login").send({ email: "appt_main_owner_test@gmail.com", password: "123456" });
  mainOwnerToken = mainOwnerLogin.body.accessToken;

  const mainService = await serviceModel.create({ business: mainBusinessId, name: "Main Service", price: 100, durationMinutes: 60, isActive: true });
  mainServiceId = mainService._id.toString();
  const mainInactiveService = await serviceModel.create({ business: mainBusinessId, name: "Inactive Service", price: 50, durationMinutes: 30, isActive: false });
  mainInactiveServiceId = mainInactiveService._id.toString();

  // A second, separate approved business - used for "book elsewhere" and
  // "service from another business" tests.
  const elsewhereOwner = await userModel.create({
    name: "Appt Elsewhere Owner",
    email: "appt_elsewhere_owner_test@gmail.com",
    password: hashedPassword,
    role: "businessOwner",
  });
  const elsewhereBusiness = await businessModel.create({
    owner: elsewhereOwner._id,
    name: "Appt Elsewhere Studio",
    description: "A separate approved business.",
    category: categoryId,
    address: "2 Appt Street",
    phone: "0501250002",
    workingHours: fullyOpenWorkingHours,
    approvalStatus: "approved",
    isActive: true,
  });
  elsewhereBusinessId = elsewhereBusiness._id.toString();
  const elsewhereOwnerLogin = await request(app).post("/auth/login").send({ email: "appt_elsewhere_owner_test@gmail.com", password: "123456" });
  elsewhereOwnerToken = elsewhereOwnerLogin.body.accessToken;
  const elsewhereService = await serviceModel.create({ business: elsewhereBusinessId, name: "Elsewhere Service", price: 80, durationMinutes: 45, isActive: true });
  elsewhereServiceId = elsewhereService._id.toString();

  // Artificial fixture: businessOwner-role user whose business is pending -
  // isolates the "business must be approved" check, same pattern as Stage 6.
  const pendingOwner = await userModel.create({
    name: "Appt Pending Owner",
    email: "appt_pending_owner_test@gmail.com",
    password: hashedPassword,
    role: "businessOwner",
  });
  const pendingBusiness = await businessModel.create({
    owner: pendingOwner._id,
    name: "Appt Pending Studio",
    description: "A pending business.",
    category: categoryId,
    address: "3 Appt Street",
    phone: "0501250003",
    workingHours: fullyOpenWorkingHours,
    approvalStatus: "pending",
  });
  pendingBusinessId = pendingBusiness._id.toString();
  const pendingService = await serviceModel.create({ business: pendingBusinessId, name: "Pending Service", price: 70, durationMinutes: 30, isActive: true });
  pendingServiceId = pendingService._id.toString();

  const rejectedOwner = await userModel.create({
    name: "Appt Rejected Owner",
    email: "appt_rejected_owner_test@gmail.com",
    password: hashedPassword,
    role: "businessOwner",
  });
  const rejectedBusiness = await businessModel.create({
    owner: rejectedOwner._id,
    name: "Appt Rejected Studio",
    description: "A rejected business.",
    category: categoryId,
    address: "4 Appt Street",
    phone: "0501250004",
    workingHours: fullyOpenWorkingHours,
    approvalStatus: "rejected",
    rejectionReason: "Test rejection",
  });
  rejectedBusinessId = rejectedBusiness._id.toString();
  const rejectedService = await serviceModel.create({ business: rejectedBusinessId, name: "Rejected Service", price: 70, durationMinutes: 30, isActive: true });
  rejectedServiceId = rejectedService._id.toString();

  const suspendedOwner = await userModel.create({
    name: "Appt Suspended Owner",
    email: "appt_suspended_owner_test@gmail.com",
    password: hashedPassword,
    role: "businessOwner",
  });
  const suspendedBusiness = await businessModel.create({
    owner: suspendedOwner._id,
    name: "Appt Suspended Studio",
    description: "An approved business that has been suspended.",
    category: categoryId,
    address: "5 Appt Street",
    phone: "0501250005",
    workingHours: fullyOpenWorkingHours,
    approvalStatus: "approved",
    isActive: false,
  });
  suspendedBusinessId = suspendedBusiness._id.toString();
  const suspendedService = await serviceModel.create({ business: suspendedBusinessId, name: "Suspended Service", price: 70, durationMinutes: 30, isActive: true });
  suspendedServiceId = suspendedService._id.toString();

  // Narrow-hours business: open only on the anchor's Israel-local weekday,
  // for a fixed 2-hour window - used for the closed-day/before-opening/
  // after-closing tests.
  const narrowOwner = await userModel.create({
    name: "Appt Narrow Owner",
    email: "appt_narrow_owner_test@gmail.com",
    password: hashedPassword,
    role: "businessOwner",
  });
  const narrowBusiness = await businessModel.create({
    owner: narrowOwner._id,
    name: "Appt Narrow Studio",
    description: "A business with narrow working hours for edge-case tests.",
    category: categoryId,
    address: "6 Appt Street",
    phone: "0501250006",
    workingHours: narrowWorkingHours,
    approvalStatus: "approved",
    isActive: true,
  });
  narrowBusinessId = narrowBusiness._id.toString();
  const narrowService = await serviceModel.create({ business: narrowBusinessId, name: "Narrow Service", price: 60, durationMinutes: 60, isActive: true });
  narrowServiceId = narrowService._id.toString();
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Appointment Booking Tests", () => {
  test("Customer can book a valid appointment", async () => {
    const startDateTime = addMinutes(new Date(), 60).toISOString();
    const response = await request(app).post("/appointments")
      .set("authorization", "JWT " + customerToken)
      .send({ business: mainBusinessId, service: mainServiceId, startDateTime });
    expect(response.statusCode).toBe(201);
    expect(response.body.data.status).toBe("pending");
    expect(response.body.data.customer).toBe(customerId);
  });

  test("endDateTime is computed from service duration", async () => {
    const startDateTime = addMinutes(new Date(), 120);
    const response = await request(app).post("/appointments")
      .set("authorization", "JWT " + customerToken)
      .send({ business: mainBusinessId, service: mainServiceId, startDateTime: startDateTime.toISOString() });
    expect(response.statusCode).toBe(201);
    const expectedEnd = addMinutes(startDateTime, 60).getTime();
    expect(new Date(response.body.data.endDateTime).getTime()).toBe(expectedEnd);
  });

  test("businessOwner can book at another business", async () => {
    // addMinutes(new Date(), 180) used to anchor this - a fixed offset from
    // "now" whose time-of-day drifts as real time passes, and can cross
    // Israel-local midnight (which isWithinWorkingHours correctly rejects as
    // overnight) depending purely on what time the suite happens to run.
    // safeFutureDateTime pins a fixed safe UTC hour instead, so this is
    // deterministic regardless of the real wall clock.
    const startDateTime = safeFutureDateTime(2).toISOString();
    const response = await request(app).post("/appointments")
      .set("authorization", "JWT " + mainOwnerToken)
      .send({ business: elsewhereBusinessId, service: elsewhereServiceId, startDateTime });
    expect(response.statusCode).toBe(201);
  });

  test("businessOwner cannot book their own business", async () => {
    const startDateTime = addMinutes(new Date(), 240).toISOString();
    const response = await request(app).post("/appointments")
      .set("authorization", "JWT " + mainOwnerToken)
      .send({ business: mainBusinessId, service: mainServiceId, startDateTime });
    expect(response.statusCode).toBe(403);
  });

  test("Admin cannot book", async () => {
    const startDateTime = addMinutes(new Date(), 60).toISOString();
    const response = await request(app).post("/appointments")
      .set("authorization", "JWT " + adminToken)
      .send({ business: mainBusinessId, service: mainServiceId, startDateTime });
    expect(response.statusCode).toBe(403);
  });

  test("Pending business is rejected", async () => {
    const startDateTime = addMinutes(new Date(), 60).toISOString();
    const response = await request(app).post("/appointments")
      .set("authorization", "JWT " + customerToken)
      .send({ business: pendingBusinessId, service: pendingServiceId, startDateTime });
    expect(response.statusCode).toBe(400);
  });

  test("Rejected business is rejected", async () => {
    const startDateTime = addMinutes(new Date(), 60).toISOString();
    const response = await request(app).post("/appointments")
      .set("authorization", "JWT " + customerToken)
      .send({ business: rejectedBusinessId, service: rejectedServiceId, startDateTime });
    expect(response.statusCode).toBe(400);
  });

  test("Suspended business is rejected", async () => {
    const startDateTime = addMinutes(new Date(), 60).toISOString();
    const response = await request(app).post("/appointments")
      .set("authorization", "JWT " + customerToken)
      .send({ business: suspendedBusinessId, service: suspendedServiceId, startDateTime });
    expect(response.statusCode).toBe(400);
  });

  test("Inactive service is rejected", async () => {
    const startDateTime = addMinutes(new Date(), 60).toISOString();
    const response = await request(app).post("/appointments")
      .set("authorization", "JWT " + customerToken)
      .send({ business: mainBusinessId, service: mainInactiveServiceId, startDateTime });
    expect(response.statusCode).toBe(400);
  });

  test("Service from another business is rejected", async () => {
    const startDateTime = addMinutes(new Date(), 60).toISOString();
    const response = await request(app).post("/appointments")
      .set("authorization", "JWT " + customerToken)
      .send({ business: mainBusinessId, service: elsewhereServiceId, startDateTime });
    expect(response.statusCode).toBe(404);
  });

  test("Past appointment is rejected", async () => {
    const startDateTime = addMinutes(new Date(), -60).toISOString();
    const response = await request(app).post("/appointments")
      .set("authorization", "JWT " + customerToken)
      .send({ business: mainBusinessId, service: mainServiceId, startDateTime });
    expect(response.statusCode).toBe(400);
  });

  test("Closed-day appointment is rejected", async () => {
    const closedDay = addMinutes(anchor, 24 * 60); // one Israel-local day later - not in narrowWorkingHours
    const response = await request(app).post("/appointments")
      .set("authorization", "JWT " + customerToken)
      .send({ business: narrowBusinessId, service: narrowServiceId, startDateTime: closedDay.toISOString() });
    expect(response.statusCode).toBe(400);
  });

  test("Booking before opening time is rejected", async () => {
    const beforeOpening = addMinutes(anchor, -60);
    const response = await request(app).post("/appointments")
      .set("authorization", "JWT " + customerToken)
      .send({ business: narrowBusinessId, service: narrowServiceId, startDateTime: beforeOpening.toISOString() });
    expect(response.statusCode).toBe(400);
  });

  test("Booking that would end after closing time is rejected", async () => {
    // narrowService is 60 minutes long; starting 90 minutes into a 120
    // -minute window means it would end 30 minutes after closing.
    const nearClosing = addMinutes(anchor, 90);
    const response = await request(app).post("/appointments")
      .set("authorization", "JWT " + customerToken)
      .send({ business: narrowBusinessId, service: narrowServiceId, startDateTime: nearClosing.toISOString() });
    expect(response.statusCode).toBe(400);
  });

  test("Valid booking within narrow working hours succeeds", async () => {
    const response = await request(app).post("/appointments")
      .set("authorization", "JWT " + customerToken)
      .send({ business: narrowBusinessId, service: narrowServiceId, startDateTime: anchor.toISOString() });
    expect(response.statusCode).toBe(201);
  });

  test("Client cannot inject customer", async () => {
    const startDateTime = addMinutes(new Date(), 300).toISOString();
    const response = await request(app).post("/appointments")
      .set("authorization", "JWT " + customerToken)
      .send({ business: mainBusinessId, service: mainServiceId, startDateTime, customer: mainOwnerId });
    expect(response.statusCode).toBe(400);
  });

  test("Client cannot inject endDateTime", async () => {
    const startDateTime = addMinutes(new Date(), 300).toISOString();
    const response = await request(app).post("/appointments")
      .set("authorization", "JWT " + customerToken)
      .send({ business: mainBusinessId, service: mainServiceId, startDateTime, endDateTime: startDateTime });
    expect(response.statusCode).toBe(400);
  });

  test("Client cannot inject status", async () => {
    const startDateTime = addMinutes(new Date(), 300).toISOString();
    const response = await request(app).post("/appointments")
      .set("authorization", "JWT " + customerToken)
      .send({ business: mainBusinessId, service: mainServiceId, startDateTime, status: "confirmed" });
    expect(response.statusCode).toBe(400);
  });

  describe("Overlap handling", () => {
    // Anchored via safeFutureDateTime, not addMinutes(new Date(), 400): a large
    // minute offset from the real current time can drift into an Israel-local
    // midnight crossing depending on what time of day the suite runs, which
    // isWithinWorkingHours correctly rejects as an overnight appointment.
    const overlapStart = safeFutureDateTime(4);

    test("First booking in the overlap window succeeds", async () => {
      const response = await request(app).post("/appointments")
        .set("authorization", "JWT " + customerToken)
        .send({ business: mainBusinessId, service: mainServiceId, startDateTime: overlapStart.toISOString() });
      expect(response.statusCode).toBe(201);
    });

    test("Overlapping pending appointment is rejected", async () => {
      const overlapping = addMinutes(overlapStart, 30); // still inside the first 60-minute booking
      const response = await request(app).post("/appointments")
        .set("authorization", "JWT " + customerToken)
        .send({ business: mainBusinessId, service: mainServiceId, startDateTime: overlapping.toISOString() });
      expect(response.statusCode).toBe(400);
    });

    test("A slot touching the boundary exactly is allowed", async () => {
      // The first booking ends exactly at overlapStart+60min - a new
      // appointment starting exactly then must be allowed.
      const touching = addMinutes(overlapStart, 60);
      const response = await request(app).post("/appointments")
        .set("authorization", "JWT " + customerToken)
        .send({ business: mainBusinessId, service: mainServiceId, startDateTime: touching.toISOString() });
      expect(response.statusCode).toBe(201);
    });

    test("Cancelling the first booking frees the slot, and a rejected one still does not block", async () => {
      // Set up: cancel the very first overlap-window booking directly, and
      // create a rejected one at a new time - neither should block a new
      // booking at the same time.
      const freeSlotStart = addMinutes(overlapStart, 500);
      const blockedAppointment = await appointmentModel.create({
        customer: customerId,
        business: mainBusinessId,
        service: mainServiceId,
        startDateTime: freeSlotStart,
        endDateTime: addMinutes(freeSlotStart, 60),
        status: "cancelled",
      });
      const rejectedAppointment = await appointmentModel.create({
        customer: customerId,
        business: mainBusinessId,
        service: mainServiceId,
        startDateTime: freeSlotStart,
        endDateTime: addMinutes(freeSlotStart, 60),
        status: "rejected",
      });
      expect(blockedAppointment.status).toBe("cancelled");
      expect(rejectedAppointment.status).toBe("rejected");

      const response = await request(app).post("/appointments")
        .set("authorization", "JWT " + mainOwnerToken)
        .send({ business: elsewhereBusinessId, service: elsewhereServiceId, startDateTime: addMinutes(freeSlotStart, 700).toISOString() });
      // Sanity: this is just confirming the booking flow still works after
      // creating cancelled/rejected records - the real overlap assertion is below.
      expect(response.statusCode).toBe(201);

      const overlappingButNonBlocking = await request(app).post("/appointments")
        .set("authorization", "JWT " + customerToken)
        .send({ business: mainBusinessId, service: mainServiceId, startDateTime: freeSlotStart.toISOString() });
      expect(overlappingButNonBlocking.statusCode).toBe(201);
    });
  });
});

describe("Appointment Viewing Tests", () => {
  let viewingAppointmentId: string;

  beforeAll(async () => {
    const startDateTime = safeFutureDateTime(5).toISOString();
    const response = await request(app).post("/appointments")
      .set("authorization", "JWT " + customerToken)
      .send({ business: mainBusinessId, service: mainServiceId, startDateTime });
    viewingAppointmentId = response.body.data._id;
  });

  test("User sees only their own appointments in /mine", async () => {
    const response = await request(app).get("/appointments/mine")
      .set("authorization", "JWT " + customerToken);
    expect(response.statusCode).toBe(200);
    const ids = response.body.data.map((a: { _id: string }) => a._id);
    expect(ids).toContain(viewingAppointmentId);
  });

  test("Populated business/service fields on /mine are safe", async () => {
    const response = await request(app).get("/appointments/mine")
      .set("authorization", "JWT " + customerToken);
    const appt = response.body.data.find((a: { _id: string }) => a._id === viewingAppointmentId);
    expect(appt.business.name).toBeDefined();
    expect(appt.service.name).toBeDefined();
    expect(appt.service.durationMinutes).toBeDefined();
  });

  test("Status filter works on /mine", async () => {
    const response = await request(app).get("/appointments/mine?status=pending")
      .set("authorization", "JWT " + customerToken);
    expect(response.statusCode).toBe(200);
    for (const appt of response.body.data) {
      expect(appt.status).toBe("pending");
    }
  });

  test("Owner can see own-business appointments", async () => {
    const response = await request(app).get(`/appointments/business/${mainBusinessId}`)
      .set("authorization", "JWT " + mainOwnerToken);
    expect(response.statusCode).toBe(200);
    const ids = response.body.data.map((a: { _id: string }) => a._id);
    expect(ids).toContain(viewingAppointmentId);
  });

  test("Non-owner is rejected from business appointments", async () => {
    const response = await request(app).get(`/appointments/business/${mainBusinessId}`)
      .set("authorization", "JWT " + elsewhereOwnerToken);
    expect(response.statusCode).toBe(403);
  });

  test("Admin can view business appointments", async () => {
    const response = await request(app).get(`/appointments/business/${mainBusinessId}`)
      .set("authorization", "JWT " + adminToken);
    expect(response.statusCode).toBe(200);
  });

  test("Customer information exposed to the owner is safe", async () => {
    const response = await request(app).get(`/appointments/business/${mainBusinessId}`)
      .set("authorization", "JWT " + mainOwnerToken);
    const appt = response.body.data.find((a: { _id: string }) => a._id === viewingAppointmentId);
    expect(appt.customer.password).toBeUndefined();
    expect(appt.customer.refreshTokens).toBeUndefined();
    expect(appt.customer.name).toBeDefined();
  });
});

describe("Appointment Status Tests", () => {
  let statusTestAppointmentId: string;

  beforeAll(async () => {
    const startDateTime = safeFutureDateTime(6).toISOString();
    const response = await request(app).post("/appointments")
      .set("authorization", "JWT " + customerToken)
      .send({ business: mainBusinessId, service: mainServiceId, startDateTime });
    statusTestAppointmentId = response.body.data._id;
  });

  test("Owner can move pending -> confirmed", async () => {
    const response = await request(app).put(`/appointments/${statusTestAppointmentId}/status`)
      .set("authorization", "JWT " + mainOwnerToken)
      .send({ status: "confirmed" });
    expect(response.statusCode).toBe(200);
    expect(response.body.data.status).toBe("confirmed");
  });

  test("Owner cannot complete a confirmed appointment before its endDateTime", async () => {
    const response = await request(app).put(`/appointments/${statusTestAppointmentId}/status`)
      .set("authorization", "JWT " + mainOwnerToken)
      .send({ status: "completed" });
    expect(response.statusCode).toBe(400);
  });

  test("Admin cannot use the status endpoint", async () => {
    const response = await request(app).put(`/appointments/${statusTestAppointmentId}/status`)
      .set("authorization", "JWT " + adminToken)
      .send({ status: "completed" });
    expect(response.statusCode).toBe(403);
  });

  test("Unrelated business owner cannot update status", async () => {
    const response = await request(app).put(`/appointments/${statusTestAppointmentId}/status`)
      .set("authorization", "JWT " + elsewhereOwnerToken)
      .send({ status: "completed" });
    expect(response.statusCode).toBe(403);
  });

  test("Customer cannot use the owner status endpoint", async () => {
    const response = await request(app).put(`/appointments/${statusTestAppointmentId}/status`)
      .set("authorization", "JWT " + customerToken)
      .send({ status: "completed" });
    expect(response.statusCode).toBe(403);
  });

  test("An invalid transition is rejected", async () => {
    // confirmed -> rejected is not a valid transition (only pending -> rejected is).
    const response = await request(app).put(`/appointments/${statusTestAppointmentId}/status`)
      .set("authorization", "JWT " + mainOwnerToken)
      .send({ status: "rejected" });
    expect(response.statusCode).toBe(400);
  });

  test("Owner can complete an appointment once its endDateTime has passed", async () => {
    const pastAppointment = await appointmentModel.create({
      customer: customerId,
      business: mainBusinessId,
      service: mainServiceId,
      startDateTime: addMinutes(new Date(), -120),
      endDateTime: addMinutes(new Date(), -60),
      status: "confirmed",
    });
    const response = await request(app).put(`/appointments/${pastAppointment._id}/status`)
      .set("authorization", "JWT " + mainOwnerToken)
      .send({ status: "completed" });
    expect(response.statusCode).toBe(200);
    expect(response.body.data.status).toBe("completed");
  });

  test("Owner can move a fresh pending appointment to rejected", async () => {
    const startDateTime = safeFutureDateTime(7).toISOString();
    const bookingResponse = await request(app).post("/appointments")
      .set("authorization", "JWT " + customerToken)
      .send({ business: mainBusinessId, service: mainServiceId, startDateTime });
    const newAppointmentId = bookingResponse.body.data._id;

    const response = await request(app).put(`/appointments/${newAppointmentId}/status`)
      .set("authorization", "JWT " + mainOwnerToken)
      .send({ status: "rejected" });
    expect(response.statusCode).toBe(200);
    expect(response.body.data.status).toBe("rejected");
  });
});

describe("Appointment Cancellation Tests", () => {
  beforeAll(async () => {
    // Ensures a clean slate for this describe's own day-anchored bookings
    // (safeFutureDateTime(8..13) below), so re-running this file against the
    // same beautyVillage_test database doesn't collide with appointments
    // left over from a previous run of this same describe block.
    await appointmentModel.deleteMany({ business: mainBusinessId });
  });

  test("Customer can cancel their own pending appointment", async () => {
    const startDateTime = safeFutureDateTime(8).toISOString();
    const bookingResponse = await request(app).post("/appointments")
      .set("authorization", "JWT " + customerToken)
      .send({ business: mainBusinessId, service: mainServiceId, startDateTime });
    const appointmentId = bookingResponse.body.data._id;

    const response = await request(app).put(`/appointments/${appointmentId}/cancel`)
      .set("authorization", "JWT " + customerToken)
      .send({ cancellationReason: "Change of plans" });
    expect(response.statusCode).toBe(200);
    expect(response.body.data.status).toBe("cancelled");
    expect(response.body.data.cancellationReason).toBe("Change of plans");
  });

  test("Customer can cancel their own confirmed appointment", async () => {
    const startDateTime = safeFutureDateTime(9).toISOString();
    const bookingResponse = await request(app).post("/appointments")
      .set("authorization", "JWT " + customerToken)
      .send({ business: mainBusinessId, service: mainServiceId, startDateTime });
    const appointmentId = bookingResponse.body.data._id;
    await request(app).put(`/appointments/${appointmentId}/status`)
      .set("authorization", "JWT " + mainOwnerToken)
      .send({ status: "confirmed" });

    const response = await request(app).put(`/appointments/${appointmentId}/cancel`)
      .set("authorization", "JWT " + customerToken)
      .send({});
    expect(response.statusCode).toBe(200);
    expect(response.body.data.status).toBe("cancelled");
  });

  test("Customer cannot cancel another user's appointment", async () => {
    const startDateTime = safeFutureDateTime(10).toISOString();
    const bookingResponse = await request(app).post("/appointments")
      .set("authorization", "JWT " + customerToken)
      .send({ business: mainBusinessId, service: mainServiceId, startDateTime });
    const appointmentId = bookingResponse.body.data._id;

    const response = await request(app).put(`/appointments/${appointmentId}/cancel`)
      .set("authorization", "JWT " + elsewhereOwnerToken)
      .send({});
    expect(response.statusCode).toBe(403);
  });

  test("Customer cannot cancel a completed appointment", async () => {
    const completedAppointment = await appointmentModel.create({
      customer: customerId,
      business: mainBusinessId,
      service: mainServiceId,
      startDateTime: addMinutes(new Date(), -120),
      endDateTime: addMinutes(new Date(), -60),
      status: "completed",
    });
    const response = await request(app).put(`/appointments/${completedAppointment._id}/cancel`)
      .set("authorization", "JWT " + customerToken)
      .send({});
    expect(response.statusCode).toBe(400);
  });

  test("Customer cannot cancel a rejected appointment", async () => {
    const rejectedAppointment = await appointmentModel.create({
      customer: customerId,
      business: mainBusinessId,
      service: mainServiceId,
      startDateTime: addMinutes(new Date(), 2500),
      endDateTime: addMinutes(new Date(), 2560),
      status: "rejected",
    });
    const response = await request(app).put(`/appointments/${rejectedAppointment._id}/cancel`)
      .set("authorization", "JWT " + customerToken)
      .send({});
    expect(response.statusCode).toBe(400);
  });

  test("Customer cannot cancel an already-cancelled appointment", async () => {
    const cancelledAppointment = await appointmentModel.create({
      customer: customerId,
      business: mainBusinessId,
      service: mainServiceId,
      startDateTime: addMinutes(new Date(), 2600),
      endDateTime: addMinutes(new Date(), 2660),
      status: "cancelled",
    });
    const response = await request(app).put(`/appointments/${cancelledAppointment._id}/cancel`)
      .set("authorization", "JWT " + customerToken)
      .send({});
    expect(response.statusCode).toBe(400);
  });

  test("Customer cannot cancel a past appointment", async () => {
    const pastAppointment = await appointmentModel.create({
      customer: customerId,
      business: mainBusinessId,
      service: mainServiceId,
      startDateTime: addMinutes(new Date(), -60),
      endDateTime: addMinutes(new Date(), -30),
      status: "confirmed",
    });
    const response = await request(app).put(`/appointments/${pastAppointment._id}/cancel`)
      .set("authorization", "JWT " + customerToken)
      .send({});
    expect(response.statusCode).toBe(400);
  });

  test("Business owner can cancel a confirmed appointment belonging to their business", async () => {
    const startDateTime = safeFutureDateTime(11).toISOString();
    const bookingResponse = await request(app).post("/appointments")
      .set("authorization", "JWT " + customerToken)
      .send({ business: mainBusinessId, service: mainServiceId, startDateTime });
    const appointmentId = bookingResponse.body.data._id;
    await request(app).put(`/appointments/${appointmentId}/status`)
      .set("authorization", "JWT " + mainOwnerToken)
      .send({ status: "confirmed" });

    const response = await request(app).put(`/appointments/${appointmentId}/cancel`)
      .set("authorization", "JWT " + mainOwnerToken)
      .send({ cancellationReason: "Staff unavailable" });
    expect(response.statusCode).toBe(200);
    expect(response.body.data.status).toBe("cancelled");
    expect(response.body.data.cancellationReason).toBe("Staff unavailable");
  });

  test("Business owner cannot cancel a pending appointment (must use reject instead)", async () => {
    const startDateTime = safeFutureDateTime(13).toISOString();
    const bookingResponse = await request(app).post("/appointments")
      .set("authorization", "JWT " + customerToken)
      .send({ business: mainBusinessId, service: mainServiceId, startDateTime });
    const appointmentId = bookingResponse.body.data._id;

    const response = await request(app).put(`/appointments/${appointmentId}/cancel`)
      .set("authorization", "JWT " + mainOwnerToken)
      .send({});
    expect(response.statusCode).toBe(400);
  });

  test("Business owner cannot cancel a past confirmed appointment", async () => {
    const pastConfirmed = await appointmentModel.create({
      customer: customerId,
      business: mainBusinessId,
      service: mainServiceId,
      startDateTime: addMinutes(new Date(), -60),
      endDateTime: addMinutes(new Date(), -30),
      status: "confirmed",
    });
    const response = await request(app).put(`/appointments/${pastConfirmed._id}/cancel`)
      .set("authorization", "JWT " + mainOwnerToken)
      .send({});
    expect(response.statusCode).toBe(400);
  });

  test("Unrelated business owner cannot cancel another business's appointment", async () => {
    const startDateTime = safeFutureDateTime(12).toISOString();
    const bookingResponse = await request(app).post("/appointments")
      .set("authorization", "JWT " + customerToken)
      .send({ business: mainBusinessId, service: mainServiceId, startDateTime });
    const appointmentId = bookingResponse.body.data._id;
    await request(app).put(`/appointments/${appointmentId}/status`)
      .set("authorization", "JWT " + mainOwnerToken)
      .send({ status: "confirmed" });

    const response = await request(app).put(`/appointments/${appointmentId}/cancel`)
      .set("authorization", "JWT " + elsewhereOwnerToken)
      .send({});
    expect(response.statusCode).toBe(403);
  });
});
