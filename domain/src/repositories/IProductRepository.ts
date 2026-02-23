import { Product, ProductProps, ProductVersion } from "../aggregates/Product";
import { Result } from "@eshop/util";

export interface IProductRepository {
    save(product: Product): Promise<void>;
    updateById(id: string, updates: Partial<ProductProps>): Promise<Result<Product>>;
    getCurrentVersion(productId: string): Promise<ProductVersion | null>;
    findById(id: string): Promise<Product | null>;
    findByVersionId(id: string): Promise<ProductVersion | null>;
    findAll(): Promise<Product[]>;
    delete(id: string): Promise<void>;
    searchProducts(phrase: string): Promise<Product[]>;
}
