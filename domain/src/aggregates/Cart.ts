export interface CartItem {
    productId: string;
    quantity: number;
}

export class Cart {
    private items: Map<string, CartItem> = new Map();
    readonly id: string; // same as cart's user id

    constructor(id: string) {
        this.id = id;
    }

    addItem(productId: string, qty = 1) {
        const key = productId.toString();
        const existing = this.items.get(key);
        if (existing) {
            existing.quantity += qty;
            this.items.set(key, existing);
        } else {
            this.items.set(key, { productId, quantity: qty });
        }
    }

    removeItem(productId: string) {
        this.items.delete(productId.toString());
    }

    setQuantity(productId: string, qty: number) {
        if (qty <= 0) return this.removeItem(productId);
        const key = productId.toString();
        this.items.set(key, { productId, quantity: qty });
    }

    listItems(): CartItem[] {
        return Array.from(this.items.values());
    }
}
