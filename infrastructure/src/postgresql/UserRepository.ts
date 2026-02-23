import { DatabaseError, Pool, QueryResult } from "pg";
import { User, UserRole } from "@eshop/domain";
import { IUserRepository } from "@eshop/domain";

export class PostgreSQLUserRepository implements IUserRepository {
    constructor(private pool: Pool) {}

    async getById(id: string): Promise<User | null> {
        const query = "SELECT id, username, password_hash, role FROM users WHERE id = $1";
        const result: QueryResult = await this.pool.query(query, [id]);

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return this.rowToUser(row);
    }

    async getByUsername(username: string): Promise<User | null> {
        const query = "SELECT id, username, password_hash, role FROM users WHERE username = $1";
        const result: QueryResult = await this.pool.query(query, [username]);

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return this.rowToUser(row);
    }

    async getAll(): Promise<User[]> {
        const query = "SELECT id, username, password_hash, role FROM users ORDER BY username";
        const result: QueryResult = await this.pool.query(query);

        return result.rows.map((row) => this.rowToUser(row));
    }

    async save(user: User): Promise<void> {
        // Check if user already exists
        const existingQuery = "SELECT id FROM users WHERE id = $1";
        const existingResult = await this.pool.query(existingQuery, [user.id]);

        if (existingResult.rows.length > 0) {
            // Update existing user
            const updateQuery =
                "UPDATE users SET username = $1, password_hash = $2, role = $3 WHERE id = $4";
            await this.pool.query(updateQuery, [
                user.username,
                user.passwordHash,
                user.role,
                user.id,
            ]);
        } else {
            // Insert new user
            const insertQuery =
                "INSERT INTO users (id, username, password_hash, role) VALUES ($1, $2, $3, $4)";
            try {
                await this.pool.query(insertQuery, [
                    user.id,
                    user.username,
                    user.passwordHash,
                    user.role,
                ]);
            } catch (err) {
                if (err instanceof DatabaseError && err.code === "23505") {
                    throw new Error("Username already taken");
                }
                throw err;
            }
        }
    }

    async delete(id: string): Promise<void> {
        const query = "DELETE FROM users WHERE id = $1";
        await this.pool.query(query, [id]);
    }

    private rowToUser(row: any): User {
        const user = new User(
            row.id,
            row.username,
            "",
            row.role == "manager" ? UserRole.Manager : UserRole.Customer
        );
        user.passwordHash = row.password_hash;
        return user;
    }
}
