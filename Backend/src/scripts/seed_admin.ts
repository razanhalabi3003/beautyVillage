import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import userModel from "../models/user_model";

const run = async () => {
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;

    if (!email || !password) {
        console.error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must both be set. Aborting.");
        process.exit(1);
    }

    if (!process.env.DB_CONNECT) {
        console.error("DB_CONNECT is not defined. Aborting.");
        process.exit(1);
    }

    await mongoose.connect(process.env.DB_CONNECT as string);
    console.log("Connected to the database for admin seeding.");

    // Idempotent: if any admin already exists, do nothing.
    const existingAdmin = await userModel.findOne({ role: "admin" });
    if (existingAdmin) {
        console.log("An admin user already exists. No changes made.");
        await mongoose.connection.close();
        process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await userModel.create({
        name: "Admin",
        email: email,
        password: hashedPassword,
        role: "admin",
        isActive: true,
    });

    console.log("Admin user created successfully.");
    await mongoose.connection.close();
    process.exit(0);
};

run().catch(async (err) => {
    console.error("Admin seeding failed:", err.message);
    await mongoose.connection.close();
    process.exit(1);
});
