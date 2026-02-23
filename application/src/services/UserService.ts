import { User, UserRole } from "@eshop/domain";
import { IUserRepository } from "@eshop/domain";
import { randomUUID } from "crypto";

export class UserService {
    constructor(private readonly users: IUserRepository) {}

    async registerUser(userId: string | null, username: string, password: string) {
        if (userId === null) {
            userId = randomUUID();
        }
        const user = new User(userId, username, password);
        this.users.save(user);
        return user;
    }

    async updateUser(
        userId: string,
        username: string | null,
        role: UserRole | null,
        password: string | null
    ) {
        const user = await this.users.getById(userId);
        if (!user) throw new Error("User not found");
        const updatedUser = user.copy();
        updatedUser.update(username, password, role);
        this.users.save(updatedUser);
        return updatedUser;
    }

    async getUserById(userId: string) {
        return this.users.getById(userId);
    }

    async getUserByUsername(username: string) {
        return this.users.getByUsername(username);
    }

    async getAllUsers() {
        return this.users.getAll();
    }

    async deleteUser(userId: string) {
        return this.users.delete(userId);
    }
}
