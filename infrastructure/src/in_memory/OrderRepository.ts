import { IOrderRepository } from "@eshop/domain";
import { Order } from "@eshop/domain";

export class InMemoryOrderRepository implements IOrderRepository {
    private store: Map<string, Order> = new Map();
    private userOrders: Map<string, string[]> = new Map();

    async save(order: Order): Promise<boolean> {
        if (this.store.has(order.id)) {
            return false;
        } else {
            this.store.set(order.id, order);
            if (!this.userOrders.has(order.userId)) {
                this.userOrders.set(order.userId, []);
            }
            this.userOrders.get(order.userId)!.push(order.id);
            return true;
        }
    }

    async findById(id: string): Promise<Order | null> {
        return this.store.get(id) ?? null;
    }

    async findByUserId(userId: string): Promise<Order[]> {
        const orderIds = this.userOrders.get(userId) ?? [];
        return orderIds.map((id) => this.store.get(id)!).filter((order) => order !== undefined);
    }

    async findAll(): Promise<Order[]> {
        return Array.from(this.store.values()).sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
        );
    }

    async findAllDelivered(): Promise<Order[]> {
        return Array.from(this.store.values())
            .filter((order) => order.isDelivered())
            .sort((a, b) => a.deliveryStatus.date.getTime() - b.deliveryStatus.date.getTime());
    }

    async findAllPending(): Promise<Order[]> {
        return (await this.findAll()).filter((order) => order.deliveryStatus.status === "pending");
    }

    async setDeliveryStatus(id: string, deliveryStatus: any): Promise<void> {
        const order = this.store.get(id);
        if (order) {
            order.deliveryStatus = deliveryStatus;
            this.store.set(id, order);
        }
    }
}
