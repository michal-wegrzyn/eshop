import { DeliveryStatus, Order } from "../aggregates/Order";

export interface IOrderRepository {
    save(order: Order): Promise<boolean>;
    findById(id: string): Promise<Order | null>;
    findByUserId(userId: string): Promise<Order[]>;
    findAll(): Promise<Order[]>;
    findAllDelivered(): Promise<Order[]>;
    findAllPending(): Promise<Order[]>;
    setDeliveryStatus(id: string, deliveryStatus: DeliveryStatus): Promise<void>;
}
