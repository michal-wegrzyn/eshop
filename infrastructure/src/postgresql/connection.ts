import { Pool } from "pg";

export const createPostgresPool = (config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
}): Pool => {
    return new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });
};
