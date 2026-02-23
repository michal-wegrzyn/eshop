CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'manager'))
);

INSERT INTO users (id, username, password_hash, role) VALUES
    ('00000000-0000-4000-b000-000000000000', 'admin', '$2b$10$4IMJ4rplIzz/dLzuH4Emq.vAU8PI9GN.aZPirVK9lBZDB67ykL8mm', 'manager'); -- password: admin123!

CREATE TABLE product_versions (
    version_id UUID PRIMARY KEY,
    product_id UUID NOT NULL,
    valid_from TIMESTAMP NOT NULL DEFAULT now(),
    valid_to TIMESTAMP DEFAULT NULL,

    name VARCHAR(100) NOT NULL,
    description TEXT,
    price INT NOT NULL,
    image_url VARCHAR(255)
);

CREATE INDEX idx_product_versions_current
ON product_versions (product_id)
WHERE valid_to IS NULL;

CREATE VIEW products AS
SELECT *
FROM product_versions
WHERE valid_to IS NULL;

CREATE TABLE cart_items (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID,
    quantity INT NOT NULL DEFAULT 1
);

CREATE TABLE orders (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    message TEXT NOT NULL DEFAULT '',
    delivery_status TEXT NOT NULL CHECK (delivery_status IN ('pending', 'delivered')),
    delivered_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES product_versions(version_id),
    quantity INT NOT NULL DEFAULT 1
)