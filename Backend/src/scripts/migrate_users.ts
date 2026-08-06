import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import userModel from "../models/user_model";

// Generates a safe default name from an email address for legacy users that
// have no name stored. Never called for users that already have a valid name.
export const generateDefaultName = (email: string): string => {
    const prefix = (email || "").split("@")[0].trim();
    return prefix.length > 0 ? prefix : "User";
};

const run = async () => {
    if (!process.env.DB_CONNECT) {
        console.error("DB_CONNECT is not defined. Aborting migration.");
        process.exit(1);
    }

    await mongoose.connect(process.env.DB_CONNECT as string);
    console.log("Connected to the database for migration.");

    // Uses the raw MongoDB collection (bypassing the Mongoose schema) so this
    // script works correctly regardless of whether the schema already
    // declares name/role/isActive as paths.
    const usersCollection = userModel.collection;

    // 1. Users missing "role" get the safe default "customer".
    const roleResult = await usersCollection.updateMany(
        { role: { $exists: false } },
        { $set: { role: "customer" } }
    );

    // 2. Users missing "isActive" get the safe default true.
    const activeResult = await usersCollection.updateMany(
        { isActive: { $exists: false } },
        { $set: { isActive: true } }
    );

    // 3. Users missing "name" get a generated value derived from their own
    // email - this needs a per-document value, so it can't be a single
    // blind updateMany like the two above.
    const usersMissingName = await usersCollection
        .find({ name: { $exists: false } })
        .project({ email: 1 })
        .toArray();

    let nameUpdatedCount = 0;
    for (const user of usersMissingName) {
        const defaultName = generateDefaultName(user.email as string);
        await usersCollection.updateOne(
            { _id: user._id },
            { $set: { name: defaultName } }
        );
        nameUpdatedCount++;
    }

    console.log(
        `Migration complete. Users updated - name: ${nameUpdatedCount}, role: ${roleResult.modifiedCount}, isActive: ${activeResult.modifiedCount}.`
    );

    await mongoose.connection.close();
    process.exit(0);
};

run().catch(async (err) => {
    console.error("Migration failed:", err);
    await mongoose.connection.close();
    process.exit(1);
});
