import { Result, ok, fail } from "@eshop/util";
import { randomUUID } from "crypto";

export interface ProductProps {
    name: string;
    description?: string;
    price: number; // in polish grosz
    imageUrl?: string;
}

export class Product {
    readonly id: string;
    private props: ProductProps;

    private constructor(id: string, props: ProductProps) {
        this.id = id;
        this.props = props;
    }

    static create(id: string, props: ProductProps): Result<Product> {
        if (!props.name || props.name.trim().length === 0) return fail("Name is required");
        if (props.price < 0) return fail("Price must be >= 0");
        const p = new Product(id, props);
        return ok(p);
    }

    get name() {
        return this.props.name;
    }
    get description() {
        return this.props.description;
    }
    get price() {
        return this.props.price;
    }
    get imageUrl() {
        return this.props.imageUrl;
    }
    getProps(): ProductProps {
        return { ...this.props };
    }

    update(props: Partial<ProductProps>) {
        this.props = { ...this.props, ...props };
    }
}

export class ProductVersion {
    readonly versionId: string;
    readonly productId: string;
    readonly validFrom: Date;
    private validTo: Date | null;
    private props: ProductProps;

    private constructor(
        versionId: string,
        productId: string,
        validFrom: Date,
        validTo: Date | null,
        props: ProductProps
    ) {
        this.versionId = versionId;
        this.productId = productId;
        this.validFrom = validFrom;
        this.validTo = validTo;
        this.props = props;
    }

    static create(
        versionId: string,
        productId: string,
        validFrom: Date,
        validTo: Date | null,
        props: ProductProps
    ): Result<ProductVersion> {
        if (!props.name || props.name.trim().length === 0) return fail("Name is required");
        if (props.price < 0) return fail("Price must be >= 0");
        if (validTo !== null && validTo < validFrom) return fail("validTo must be after validFrom");
        const p = new ProductVersion(versionId, productId, validFrom, validTo, props);
        return ok(p);
    }

    get name() {
        return this.props.name;
    }
    get description() {
        return this.props.description;
    }
    get price() {
        return this.props.price;
    }
    get imageUrl() {
        return this.props.imageUrl;
    }
    getProps(): ProductProps {
        return { ...this.props };
    }

    update(props: Partial<ProductProps>) {
        this.props = { ...this.props, ...props };
    }

    get validto(): Date | null {
        return this.validTo;
    }

    setValidTo(date: Date): boolean {
        if (this.validTo !== null) {
            return false;
        }
        this.validTo = date;
        return true;
    }
}

export function productFromVersion(pv: ProductVersion): Product | null {
    if (pv.validto !== null) return null;
    const r = Product.create(pv.productId, pv.getProps());
    if (!r.isSuccess) return null;
    return r.value;
}

export function versionFromProduct(product: Product): ProductVersion | null {
    const now = new Date();
    const versionId = randomUUID();
    const r = ProductVersion.create(versionId, product.id, now, null, product.getProps());
    if (!r.isSuccess) return null;
    return r.value;
}
