import { IProductRepository } from "@eshop/domain";
import {
    Product,
    ProductProps,
    ProductVersion,
    productFromVersion,
    versionFromProduct,
} from "@eshop/domain";
import { ok, fail } from "@eshop/util";

export class InMemoryProductRepository implements IProductRepository {
    private store: Map<string, ProductVersion> = new Map();
    private currentVersionId: Map<string, string> = new Map();

    async save(product: Product): Promise<void> {
        const version = this.currentVersionId.get(product.id);
        let pv = versionFromProduct(product);
        if (!pv) return;
        if (version) {
            let oldPv = this.store.get(version);
            if (oldPv !== undefined && oldPv.validto === null) {
                oldPv.setValidTo(new Date());
                this.store.set(version, oldPv);
            }
        }
        this.store.set(pv.versionId, pv);
        this.currentVersionId.set(product.id, pv.versionId);
    }

    async updateById(id: string, updates: Partial<ProductProps>) {
        const product = await this.findById(id);
        if (product === null) return fail("Product not found");
        product.update(updates);
        this.save(product);
        return ok(product);
    }

    async getCurrentVersion(productId: string): Promise<ProductVersion | null> {
        const versionId = this.currentVersionId.get(productId);
        if (!versionId) return null;
        const pv = this.store.get(versionId);
        if (!pv) return null;
        return pv;
    }

    async findById(id: string): Promise<Product | null> {
        const versionId = this.currentVersionId.get(id);
        if (!versionId) return null;
        const pv = this.store.get(versionId);
        if (!pv) return null;
        return productFromVersion(pv);
    }

    async findByVersionId(id: string): Promise<ProductVersion | null> {
        const pv = this.store.get(id);
        if (!pv) return null;
        return pv;
    }

    async findAll(): Promise<Product[]> {
        const products: Product[] = [];
        for (const [id, versionId] of this.currentVersionId.entries()) {
            const pv = this.store.get(versionId);
            if (pv) {
                const product = productFromVersion(pv);
                if (product) {
                    products.push(product);
                }
            }
        }
        return products;
    }

    async delete(id: string): Promise<void> {
        const versionId = this.currentVersionId.get(id);
        if (versionId) {
            const pv = this.store.get(versionId);
            if (pv) {
                pv.setValidTo(new Date());
                this.store.set(versionId, pv);
            }
            this.currentVersionId.delete(id);
        }
    }

    async searchProducts(phrase: string): Promise<Product[]> {
        const lowerPhrase = phrase.toLowerCase();
        const products = await this.findAll();
        return products
            .filter((product) => product.name.toLowerCase().includes(lowerPhrase))
            .concat(
                products.filter(
                    (product) =>
                        product.description &&
                        product.description.toLowerCase().includes(lowerPhrase) &&
                        !product.name.toLowerCase().includes(lowerPhrase)
                )
            );
    }
}
