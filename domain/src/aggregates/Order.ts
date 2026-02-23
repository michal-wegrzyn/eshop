import { randomUUID } from "crypto";

export interface OrderItem {
    productVersionId: string;
    quantity: number;
}

export type DeliveryStatus = { status: "delivered"; date: Date } | { status: "pending" };

export const delivered = (date: Date): DeliveryStatus => ({ status: "delivered", date });
export const pending = (): DeliveryStatus => ({ status: "pending" });

export class Order {
    readonly items: OrderItem[];
    readonly id: string;
    readonly userId: string;
    readonly message: string;
    readonly createdAt: Date;
    public deliveryStatus: DeliveryStatus;

    constructor(
        id: string | null,
        userId: string,
        items: OrderItem[],
        message: string = "",
        deliveryStatus?: DeliveryStatus,
        createdAt?: Date
    ) {
        if (id === null) {
            id = randomUUID();
        }
        this.id = id;
        this.userId = userId;
        this.items = items;
        this.message = message;
        this.deliveryStatus = deliveryStatus || pending();
        this.createdAt = createdAt || new Date();
    }

    listItems(): OrderItem[] {
        return this.items;
    }

    markAsDelivered(date?: Date) {
        this.deliveryStatus = { status: "delivered", date: date || new Date() };
    }

    isDelivered(): this is Order & { deliveryStatus: { status: "delivered"; date: Date } } {
        return this.deliveryStatus.status === "delivered";
    }

    markAsPending() {
        this.deliveryStatus = { status: "pending" };
    }
}
