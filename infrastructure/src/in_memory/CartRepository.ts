import { ICartRepository } from "@eshop/domain";
import { Cart } from "@eshop/domain";

export class InMemoryCartRepository implements ICartRepository {
    private store: Map<string, Cart> = new Map();

    async save(cart: Cart): Promise<void> {
        this.store.set(cart.id, cart);
    }

    async findById(id: string): Promise<Cart | null> {
        return this.store.get(id) ?? null;
    }

    async delete(id: string): Promise<void> {
        this.store.delete(id);
    }

    async findAll(): Promise<Cart[]> {
        return Array.from(this.store.values());
    }

    async deleteProductFromCarts(productId: string): Promise<void> {
        for (const cart of this.store.values()) {
            cart.removeItem(productId);
        }
    }
}
