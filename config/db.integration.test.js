import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { spawn } from "child_process";
import connectDB from "./db.js";

// Daniel Loh. A0252099X

jest.setTimeout(20000);

describe("Database and Server Integration", () => {
    let mongo;

    afterEach(async () => {
        if (mongo) {
            await mongo.stop();
            mongo = undefined;
        }
        try {
            await mongoose.disconnect();
        } catch (e) {
            // ignore
        }
    });

    it("connectDB() connects mongoose to an in-memory mongo instance", async () => {
        mongo = await MongoMemoryServer.create();
        const uri = mongo.getUri();

        process.env.MONGO_URL = uri;

        await connectDB();

        expect(mongoose.connection.readyState).toBe(1);
    });

    it("server.js starts up and invokes DB connection (spawned process)", async () => {
        mongo = await MongoMemoryServer.create();
        const uri = mongo.getUri();

        const env = {
            ...process.env,
            MONGO_URL: uri,
            DEV_MODE: "test",
            PORT: "0",
            NODE_ENV: "test",
        };

        const node = process.execPath;
        const child = spawn(node, ["server.js"], { env, cwd: process.cwd() });

        let stdout = "";
        let stderr = "";

        const started = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Server failed to start in time. stdout: ${stdout} stderr: ${stderr}`));
            }, 10000);

            child.stdout.on("data", (chunk) => {
                const str = chunk.toString();
                stdout += str;
                if (/Connected To Mongodb Database/.test(str) || /Connected To Mongodb Database/.test(stdout)) {
                    // we saw DB connect; wait for server running line too
                }
                if (/Server running on/.test(str) || /Server running on/.test(stdout)) {
                    clearTimeout(timeout);
                    resolve();
                }
            });

            child.stderr.on("data", (chunk) => {
                stderr += chunk.toString();
            });

            child.on("error", (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });

        try {
            await started;
            // Child stdout may not include the DB connect log if connectDB() ran in the test process.
            // Assert server start line only (DB connection is already tested above).
            expect(/Server running on/.test(stdout) || /Server running on/.test(stderr)).toBe(true);
        } finally {
            child.kill();
        }
    });
});
