import { Cart } from "../aggregates/Cart";

export interface ICartRepository {
    save(cart: Cart): Promise<void>;
    findById(id: string): Promise<Cart | null>;
    findAll(): Promise<Cart[]>;
    delete(id: string): Promise<void>;
    deleteProductFromCarts(productId: string): Promise<void>;
}
