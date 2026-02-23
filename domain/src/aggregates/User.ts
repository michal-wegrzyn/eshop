import { hashSync, compare } from "bcrypt";

export enum UserRole {
    Customer = "customer",
    Manager = "manager",
}

export class User {
    public passwordHash: string;
    public role: UserRole;
    constructor(readonly id: string, public username: string, password: string, role?: UserRole) {
        this.passwordHash = hashSync(password, 10);
        this.role = role ?? UserRole.Customer;
    }

    update(username: string | null, password: string | null, role: UserRole | null) {
        if (username !== null) {
            this.username = username;
        }
        if (role !== null) {
            this.role = role;
        }
        if (password !== null) {
            this.passwordHash = hashSync(password, 10);
        }
    }

    async verifyPassword(password: string): Promise<boolean> {
        return compare(password, this.passwordHash);
    }

    copy(): User {
        return new User(this.id, this.username, this.passwordHash, this.role);
    }
}
