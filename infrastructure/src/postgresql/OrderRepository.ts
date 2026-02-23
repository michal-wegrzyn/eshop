import { Pool, QueryResult } from "pg";
import { IOrderRepository, Order, DeliveryStatus } from "@eshop/domain";
import { randomUUID } from "crypto";

export class PostgreSQLOrderRepository implements IOrderRepository {
    constructor(private pool: Pool) {}

    async save(order: Order): Promise<boolean> {
        // Check if order already exists
        const existingQuery = "SELECT id FROM orders WHERE id = $1";
        const existingResult = await this.pool.query(existingQuery, [order.id]);

        if (existingResult.rows.length > 0) {
            return false;
        }

        // Determine delivery status
        let deliveryStatusText = "pending";
        let deliveredAt = null;
        if (order.deliveryStatus.status === "delivered") {
            deliveryStatusText = "delivered";
            deliveredAt = order.deliveryStatus.date;
        }

        // Insert order
        const insertOrderQuery = `
            INSERT INTO orders (id, user_id, message, delivery_status, delivered_at, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
        await this.pool.query(insertOrderQuery, [
            order.id,
            order.userId,
            order.message,
            deliveryStatusText,
            deliveredAt,
            order.createdAt,
        ]);

        // Insert order items
        for (const item of order.items) {
            const itemQuery = `
                INSERT INTO order_items (id, order_id, version_id, quantity)
                VALUES ($1, $2, $3, $4)
            `;
            await this.pool.query(itemQuery, [
                randomUUID(),
                order.id,
                item.productVersionId,
                item.quantity,
            ]);
        }

        return true;
    }

    async findById(id: string): Promise<Order | null> {
        const orderQuery = `
            SELECT id, user_id, message, delivery_status, delivered_at, created_at
            FROM orders
            WHERE id = $1
        `;
        const orderResult: QueryResult = await this.pool.query(orderQuery, [id]);

        if (orderResult.rows.length === 0) {
            return null;
        }

        const orderRow = orderResult.rows[0];

        // Get order items
        const itemsQuery = `
            SELECT version_id, quantity
            FROM order_items
            WHERE order_id = $1
        `;
        const itemsResult: QueryResult = await this.pool.query(itemsQuery, [id]);

        const items = itemsResult.rows.map((row) => ({
            productVersionId: row.version_id,
            quantity: row.quantity,
        }));

        // Parse delivery status
        let deliveryStatus: DeliveryStatus;
        if (orderRow.delivery_status === "delivered") {
            deliveryStatus = { status: "delivered", date: new Date(orderRow.delivered_at) };
        } else {
            deliveryStatus = { status: "pending" };
        }

        const order = new Order(
            orderRow.id,
            orderRow.user_id,
            items,
            orderRow.message,
            deliveryStatus,
            new Date(orderRow.created_at)
        );

        return order;
    }

    async findByUserId(userId: string): Promise<Order[]> {
        const query = `
            SELECT id, user_id, message, delivery_status, delivered_at, created_at
            FROM orders
            WHERE user_id = $1
            ORDER BY created_at DESC
        `;
        const result: QueryResult = await this.pool.query(query, [userId]);

        const orders: Order[] = [];
        for (const row of result.rows) {
            const order = await this.findById(row.id);
            if (order) {
                orders.push(order);
            }
        }

        return orders;
    }

    async findAll(): Promise<Order[]> {
        const query = `
            SELECT id
            FROM orders
            ORDER BY created_at DESC
        `;
        const result: QueryResult = await this.pool.query(query);

        const orders: Order[] = [];
        for (const row of result.rows) {
            const order = await this.findById(row.id);
            if (order) {
                orders.push(order);
            }
        }

        return orders;
    }

    async findAllDelivered(): Promise<Order[]> {
        const query = `
            SELECT id
            FROM orders
            WHERE delivery_status = 'delivered'
            ORDER BY delivered_at DESC
        `;
        const result: QueryResult = await this.pool.query(query);

        const orders: Order[] = [];
        for (const row of result.rows) {
            const order = await this.findById(row.id);
            if (order && order.isDelivered()) {
                orders.push(order);
            }
        }

        return orders;
    }

    async findAllPending(): Promise<Order[]> {
        const query = `
            SELECT id
            FROM orders
            WHERE delivery_status = 'pending'
            ORDER BY created_at DESC
        `;
        const result: QueryResult = await this.pool.query(query);

        const orders: Order[] = [];
        for (const row of result.rows) {
            const order = await this.findById(row.id);
            if (order) {
                orders.push(order);
            }
        }

        return orders;
    }

    async setDeliveryStatus(id: string, deliveryStatus: DeliveryStatus): Promise<void> {
        let deliveryStatusText = "pending";
        let deliveredAt = null;
        if (deliveryStatus.status === "delivered") {
            deliveryStatusText = "delivered";
            deliveredAt = deliveryStatus.date;
        }

        const query = `
            UPDATE orders
            SET delivery_status = $1, delivered_at = $2
            WHERE id = $3
        `;
        await this.pool.query(query, [deliveryStatusText, deliveredAt, id]);
    }
}
