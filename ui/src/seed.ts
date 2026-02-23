import {
    createPostgresPool,
    PostgreSQLProductRepository,
    PostgreSQLUserRepository,
} from "@eshop/infrastructure";

import { Product, User, UserRole, IProductRepository, IUserRepository } from "@eshop/domain";
import { randomUUID } from "crypto";

export async function addDataToRepositories(
    productRepository: IProductRepository,
    userRepository: IUserRepository,
) {
    // Add users
    const users = [
        new User(randomUUID(), "Alice", "alice123!", UserRole.Customer),
        new User(randomUUID(), "Bob", "bob123!", UserRole.Manager),
        new User(randomUUID(), "Charlie", "charlie123!", UserRole.Customer),
        new User(randomUUID(), "Donald", "donald123!", UserRole.Customer),
        new User(randomUUID(), "Emily", "emily123!", UserRole.Customer),
        new User(randomUUID(), "Henry", "henry123!", UserRole.Customer),
        new User(randomUUID(), "John", "john123!", UserRole.Customer),
    ];
    for (const user of users) {
        await userRepository.save(user);
    }

    // Add products
    const products = [
        Product.create(randomUUID(), {
            name: "Laptop",
            description: `A high-performance laptop. Perfect for work and gaming.
It has a powerful processor and long battery life.
Great design and lightweight for portability.
Ideal for professionals and students.
Experience stunning visuals with its high-resolution display.
Comes with 1TB storage and fast SSD.`,
            price: 400000,
            imageUrl: "/laptop.jpg",
        }),
        Product.create(randomUUID(), {
            name: "Smartphone",
            description: `A latest model smartphone. Features a stunning display and excellent camera.
Long-lasting battery and fast processor.
Sleek design with multiple color options: black, white, blue, and gray.
Advanced security features including fingerprint recognition.
Ideal for photography enthusiasts and mobile gamers.`,
            price: 120000,
            imageUrl: "/phone.png",
        }),
        Product.create(randomUUID(), {
            name: "Headphones",
            description: "Noise-cancelling headphones",
            price: 50000,
            imageUrl: "/headphones.jpg",
        }),
        Product.create(randomUUID(), {
            name: "Tablet",
            description: "A lightweight tablet for entertainment and work.",
            price: 150000,
            imageUrl: "/tablet.jpg",
        }),
        Product.create(randomUUID(), {
            name: "Mouse",
            description: "A high-precision wireless mouse.",
            price: 20000,
            imageUrl: "/mouse.jpg",
        }),
        Product.create(randomUUID(), {
            name: "Monitor",
            description: `A high-resolution monitor. Perfect for gaming and professional work.
Features vibrant colors and sharp details.
Ergonomic design with adjustable stand for comfortable viewing.
Ideal for graphic designers, video editors, and gamers.
Experience immersive visuals with its large display size.`,
            price: 100000,
            imageUrl: "/monitor.jpeg",
        }),
    ];
    for (const product of products) {
        if (product.isSuccess) await productRepository.save(product.value);
    }
}

async function main() {
    const pool = createPostgresPool({
        host: "localhost",
        port: 5432,
        database: "eshop",
        user: "eshop",
        password: "eshoppassword123",
    });
    const productRepository = new PostgreSQLProductRepository(pool);
    const userRepository = new PostgreSQLUserRepository(pool);
    await addDataToRepositories(productRepository, userRepository);
}

main()
    .then(() => {
        console.log("Data added successfully.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Error adding data:", error);
        process.exit(1);
    });
