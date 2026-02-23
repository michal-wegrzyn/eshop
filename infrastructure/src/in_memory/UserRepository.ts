import { User } from "@eshop/domain";
import { IUserRepository } from "@eshop/domain";

export class InMemoryUserRepository implements IUserRepository {
    private users = new Map<string, User>();
    private usernames = new Map<string, string>();

    async getById(id: string) {
        return this.users.get(id) ?? null;
    }

    async getByUsername(username: string) {
        const userId = this.usernames.get(username);
        if (!userId) return null;
        return this.getById(userId);
    }

    async getAll(): Promise<User[]> {
        return Array.from(this.users.values());
    }

    async save(user: User) {
        if (user.username) {
            const existingUserId = this.usernames.get(user.username);
            if (existingUserId && existingUserId !== user.id) {
                throw new Error("Username already in use");
            }
            const currentUsername = this.users.get(user.id)?.username;
            if (currentUsername && currentUsername !== user.username) {
                this.usernames.delete(currentUsername);
            }
        }
        this.users.set(user.id, user);
        this.usernames.set(user.username, user.id);
    }

    async delete(id: string) {
        const user = this.users.get(id);
        if (user && user.username) {
            this.usernames.delete(user.username);
        }
        this.users.delete(id);
    }
}
