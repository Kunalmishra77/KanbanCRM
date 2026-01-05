import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is missing");

const client = postgres(connectionString);
const db = drizzle(client);

async function main() {
    try {
        console.log("Checking database connection...");
        const result = await client`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
        console.log("Tables found:", result.map(row => row.table_name));

        // Check if 'users' table exists as expected
        if (result.some(row => row.table_name === 'users')) {
            console.log("SUCCESS: 'users' table exists.");
        } else {
            console.log("FAILURE: 'users' table NOT found.");
        }
    } catch (error) {
        console.error("Error connecting to database:", error);
    } finally {
        await client.end();
    }
}

main();
