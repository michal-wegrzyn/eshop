import { IProductRepository, ICartRepository } from "@eshop/domain";
import { Product, ProductProps } from "@eshop/domain";
import { ok, fail } from "../../../util/src/Result";
import { randomUUID } from "crypto";

export class ProductService {
    constructor(private repo: IProductRepository, private cartRepo: ICartRepository) {}

    async createProduct(id: string | null, props: ProductProps) {
        if (id === null) {
            id = randomUUID();
        }
        const r = Product.create(id, props);
        if (!r.isSuccess) return r;
        await this.repo.save(r.value);
        return ok(r.value);
    }

    async listAll() {
        return this.repo.findAll();
    }

    async getProductById(id: string) {
        const p = await this.repo.findById(id);
        if (!p) return fail("Product not found");
        return ok(p);
    }

    async getProductVersionById(versionId: string) {
        const pv = await this.repo.findByVersionId(versionId);
        if (!pv) return fail("Product version not found");
        return ok(pv);
    }

    async searchProducts(phrase: string) {
        if (phrase === "") {
            return this.repo.findAll();
        }
        const products = await this.repo.searchProducts(phrase);
        return ok(products);
    }

    async updateProduct(id: string, fields: Partial<ProductProps>) {
        return this.repo.updateById(id, fields);
    }

    async deleteProduct(id: string) {
        await this.repo.delete(id);
        await this.cartRepo.deleteProductFromCarts(id);
        return ok(undefined as void);
    }
}
