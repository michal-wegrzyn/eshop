import { Pool, QueryResult } from "pg";
import { ICartRepository } from "@eshop/domain";
import { Cart } from "@eshop/domain";
import { randomUUID } from "crypto";

export class PostgreSQLCartRepository implements ICartRepository {
    constructor(private pool: Pool) {}

    async save(cart: Cart): Promise<void> {
        // Delete existing cart items for this user
        const deleteQuery = "DELETE FROM cart_items WHERE user_id = $1";
        await this.pool.query(deleteQuery, [cart.id]);

        // Insert all current cart items
        const items = cart.listItems();
        for (const item of items) {
            const insertQuery = `
                INSERT INTO cart_items (id, user_id, product_id, quantity)
                VALUES ($1, $2, $3, $4)
            `;
            await this.pool.query(insertQuery, [
                randomUUID(),
                cart.id,
                item.productId,
                item.quantity,
            ]);
        }
    }

    async findById(id: string): Promise<Cart | null> {
        const query = "SELECT product_id, quantity FROM cart_items WHERE user_id = $1";
        const result: QueryResult = await this.pool.query(query, [id]);

        const cart = new Cart(id);
        for (const row of result.rows) {
            cart.addItem(row.product_id, row.quantity);
        }

        return cart;
    }

    async findAll(): Promise<Cart[]> {
        const query = "SELECT DISTINCT user_id FROM cart_items";
        const result: QueryResult = await this.pool.query(query);

        const carts: Cart[] = [];
        for (const row of result.rows) {
            const cart = await this.findById(row.user_id);
            if (cart) {
                carts.push(cart);
            }
        }

        return carts;
    }

    async delete(id: string): Promise<void> {
        const query = "DELETE FROM cart_items WHERE user_id = $1";
        await this.pool.query(query, [id]);
    }

    async deleteProductFromCarts(productId: string): Promise<void> {
        const query = "DELETE FROM cart_items WHERE product_id = $1";
        await this.pool.query(query, [productId]);
    }
}
