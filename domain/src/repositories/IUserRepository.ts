import { User } from "../aggregates/User";

export interface IUserRepository {
    getById(id: string): Promise<User | null>;
    getByUsername(username: string): Promise<User | null>;
    getAll(): Promise<User[]>;
    save(user: User): Promise<void>;
    delete(id: string): Promise<void>;
}
