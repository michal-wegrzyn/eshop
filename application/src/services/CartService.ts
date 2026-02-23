import { ICartRepository } from "@eshop/domain";
import { IProductRepository } from "@eshop/domain";
import { Cart } from "@eshop/domain";

export class CartService {
    constructor(private cartRepo: ICartRepository, private productRepo: IProductRepository) {}

    async getOrCreateCart(cartId: string) {
        let c = await this.cartRepo.findById(cartId);
        if (!c) {
            c = new Cart(cartId);
        }
        // Remove cart items with zero quantity or inexistent products
        const items = c.listItems();
        for (const item of items) {
            if (item.quantity <= 0) {
                c.removeItem(item.productId);
                continue;
            }
            const product = await this.productRepo.findById(item.productId);
            if (!product) {
                c.removeItem(item.productId);
            }
        }
        await this.cartRepo.save(c);
        return c;
    }

    async addToCart(cartId: string, productId: string, qty = 1) {
        const product = await this.productRepo.findById(productId);
        if (!product) throw new Error("Product not found");
        const cart = await this.getOrCreateCart(cartId);
        cart.addItem(productId, qty);
        await this.cartRepo.save(cart);
        return cart;
    }

    async setQuantity(cartId: string, productId: string, qty: number) {
        const cart = await this.getOrCreateCart(cartId);
        cart.setQuantity(productId, qty);
        await this.cartRepo.save(cart);
        return cart;
    }

    async viewCart(cartId: string) {
        const cart = await this.getOrCreateCart(cartId);
        const items = (
            await Promise.all(
                cart.listItems().map(async (item) => {
                    const product = await this.productRepo.findById(item.productId);
                    return {
                        product,
                        quantity: item.quantity,
                    };
                })
            )
        ).filter(
            (item): item is { product: NonNullable<typeof item.product>; quantity: number } =>
                item.product !== null
        );
        return {
            id: cart.id,
            items: items.filter((item) => item.product !== null),
        };
    }

    async deleteCart(cartId: string) {
        await this.cartRepo.delete(cartId);
    }
}
