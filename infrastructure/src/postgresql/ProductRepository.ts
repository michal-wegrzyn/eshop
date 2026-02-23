import { Pool, QueryResult } from "pg";
import { IProductRepository } from "@eshop/domain";
import {
    Product,
    ProductProps,
    ProductVersion,
    productFromVersion,
    versionFromProduct,
} from "@eshop/domain";
import { ok, fail, Result } from "@eshop/util";

export class PostgreSQLProductRepository implements IProductRepository {
    constructor(private pool: Pool) {}

    async save(product: Product): Promise<void> {
        const pv = versionFromProduct(product);
        if (!pv) return;

        // Get current version for this product
        const currentVersionQuery = "SELECT version_id FROM products WHERE product_id = $1";
        const currentVersionResult = await this.pool.query(currentVersionQuery, [product.id]);

        // If there's a current version, mark it as expired
        if (currentVersionResult.rows.length > 0) {
            const oldVersionId = currentVersionResult.rows[0].version_id;
            const updateQuery = "UPDATE product_versions SET valid_to = $1 WHERE version_id = $2";
            await this.pool.query(updateQuery, [new Date(), oldVersionId]);
        }

        // Insert new version
        const insertQuery = `
            INSERT INTO product_versions (version_id, product_id, valid_from, name, description, price, image_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        await this.pool.query(insertQuery, [
            pv.versionId,
            product.id,
            pv.validFrom,
            product.name,
            product.description,
            product.price,
            product.imageUrl,
        ]);
    }

    async updateById(id: string, updates: Partial<ProductProps>): Promise<Result<Product>> {
        const product = await this.findById(id);
        if (product === null) return fail("Product not found");

        product.update(updates);
        await this.save(product);
        return ok(product);
    }

    async getCurrentVersion(productId: string): Promise<ProductVersion | null> {
        const query = `
            SELECT version_id, product_id, valid_from, valid_to, name, description, price, image_url
            FROM products
            WHERE product_id = $1
            LIMIT 1
        `;
        const result: QueryResult = await this.pool.query(query, [productId]);

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        const props: ProductProps = {
            name: row.name,
            description: row.description,
            price: row.price,
            imageUrl: row.image_url,
        };

        const pvResult = ProductVersion.create(
            row.version_id,
            row.product_id,
            new Date(row.valid_from),
            row.valid_to ? new Date(row.valid_to) : null,
            props
        );

        if (!pvResult.isSuccess) {
            return null;
        }

        return pvResult.value;
    }

    async findById(id: string): Promise<Product | null> {
        const pv = await this.getCurrentVersion(id);
        if (!pv) return null;
        return productFromVersion(pv);
    }

    async findByVersionId(id: string): Promise<ProductVersion | null> {
        const query = `
            SELECT version_id, product_id, valid_from, valid_to, name, description, price, image_url
            FROM product_versions
            WHERE version_id = $1
        `;
        const result: QueryResult = await this.pool.query(query, [id]);

        if (result.rows.length === 0) {
            console.log("No rows found for version id:", id);
            return null;
        }

        const row = result.rows[0];
        const props: ProductProps = {
            name: row.name,
            description: row.description,
            price: row.price,
            imageUrl: row.image_url,
        };

        const pvResult = ProductVersion.create(
            row.version_id,
            row.product_id,
            new Date(row.valid_from),
            row.valid_to ? new Date(row.valid_to) : null,
            props
        );

        if (!pvResult.isSuccess) {
            console.log("Failed to create ProductVersion for version id:", id, pvResult.error);
            console.log(
                new Date(row.valid_from),
                row.valid_to ? new Date(row.valid_to) : null,
                props
            );
            return null;
        }

        return pvResult.value;
    }

    async findAll(): Promise<Product[]> {
        const query = `
            SELECT version_id, product_id, valid_from, valid_to, name, description, price, image_url
            FROM products
            ORDER BY valid_from DESC
        `;
        const result: QueryResult = await this.pool.query(query);

        const products: Product[] = [];
        for (const row of result.rows) {
            const props: ProductProps = {
                name: row.name,
                description: row.description,
                price: row.price,
                imageUrl: row.image_url,
            };

            const pvResult = ProductVersion.create(
                row.version_id,
                row.product_id,
                new Date(row.valid_from),
                row.valid_to ? new Date(row.valid_to) : null,
                props
            );

            if (pvResult.isSuccess) {
                const product = productFromVersion(pvResult.value);
                if (product) {
                    products.push(product);
                }
            }
        }
        return products;
    }

    async delete(id: string): Promise<void> {
        const query =
            "UPDATE product_versions SET valid_to = $1 WHERE product_id = $2 AND valid_to IS NULL";
        await this.pool.query(query, [new Date(), id]);
    }

    async searchProducts(phrase: string): Promise<Product[]> {
        const lowerPhrase = phrase.toLowerCase();
        const query = `
            SELECT version_id, product_id, valid_from, valid_to, name, description, price, image_url
            FROM product_versions
            WHERE valid_to IS NULL
            AND (LOWER(name) LIKE $1 OR LOWER(description) LIKE $1)
            ORDER BY 
                CASE 
                    WHEN LOWER(name) LIKE $1 THEN 0
                    ELSE 1
                END,
                valid_from DESC
        `;
        const result: QueryResult = await this.pool.query(query, [`%${lowerPhrase}%`]);

        const products: Product[] = [];
        for (const row of result.rows) {
            const props: ProductProps = {
                name: row.name,
                description: row.description,
                price: row.price,
                imageUrl: row.image_url,
            };

            const pvResult = ProductVersion.create(
                row.version_id,
                row.product_id,
                new Date(row.valid_from),
                row.valid_to ? new Date(row.valid_to) : null,
                props
            );

            if (pvResult.isSuccess) {
                const product = productFromVersion(pvResult.value);
                if (product) {
                    products.push(product);
                }
            }
        }
        return products;
    }
}
