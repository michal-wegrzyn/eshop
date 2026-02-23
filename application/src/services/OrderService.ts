import { IOrderRepository } from "@eshop/domain";
import { ICartRepository } from "@eshop/domain";
import { IProductRepository } from "@eshop/domain";
import { Order, OrderItem, pending } from "@eshop/domain";

export class OrderService {
    constructor(
        private orderRepo: IOrderRepository,
        private productRepo: IProductRepository,
        private cartRepo: ICartRepository
    ) {}

    async createOrder(order: Order): Promise<boolean> {
        for (const item of order.listItems()) {
            const pv = await this.productRepo.findByVersionId(item.productVersionId);
            if (!pv) return false;
        }
        return this.orderRepo.save(order);
    }

    async createOrderFromCart(userId: string, message: string = ""): Promise<string | null> {
        const cart = await this.cartRepo.findById(userId);
        if (!cart) return null;
        const items: OrderItem[] = (
            await Promise.all(
                cart.listItems().map(async (item) => ({
                    productVersionId:
                        (await this.productRepo.getCurrentVersion(item.productId))?.versionId ??
                        null,
                    quantity: item.quantity,
                }))
            )
        ).filter(
            (item): item is OrderItem & { productVersionId: string } =>
                item.productVersionId !== null
        );

        const order = new Order(null, userId, items, message);
        const saved = await this.orderRepo.save(order);
        if (!saved) return null;
        await this.cartRepo.delete(userId);
        return order.id;
    }

    async getOrderById(id: string): Promise<Order | null> {
        return this.orderRepo.findById(id);
    }

    async getOrdersByUserId(userId: string): Promise<Order[]> {
        return this.orderRepo.findByUserId(userId);
    }

    async getAllOrders(): Promise<Order[]> {
        return this.orderRepo.findAll();
    }

    async getAllDeliveredOrders(): Promise<Order[]> {
        return this.orderRepo.findAllDelivered();
    }

    async getAllPendingOrders(): Promise<Order[]> {
        return this.orderRepo.findAllPending();
    }

    async updateDeliveryStatus(id: string, deliveryStatus: any): Promise<void> {
        return this.orderRepo.setDeliveryStatus(id, deliveryStatus);
    }

    async view(orderId: string) {
        const order = await this.getOrderById(orderId);
        if (!order) {
            return null;
        }
        const items = await Promise.all(
            order.listItems().map(async (item) => {
                const pv = await this.productRepo.findByVersionId(item.productVersionId);
                return {
                    pv,
                    quantity: item.quantity,
                };
            })
        );
        return {
            id: order.id,
            items: items.filter((item) => item.pv !== null),
        };
    }
}
