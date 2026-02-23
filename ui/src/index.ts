import express, { Request, Response } from "express";
import session from "express-session";
import expressLayouts = require("express-ejs-layouts");
import path from "path";
import { CartService, ProductService, UserService, OrderService } from "@eshop/application";
// import {
//     InMemoryCartRepository,
//     InMemoryProductRepository,
//     InMemoryUserRepository,
//     InMemoryOrderRepository,
// } from "@eshop/infrastructure";
import {
    createPostgresPool,
    PostgreSQLCartRepository,
    PostgreSQLProductRepository,
    PostgreSQLUserRepository,
    PostgreSQLOrderRepository,
} from "@eshop/infrastructure";
import { UserRole } from "@eshop/domain";

import { hash, compare } from "bcrypt";
import connectPgSimple from "connect-pg-simple";

// const cartRepository = new InMemoryCartRepository();
// const productRepository = new InMemoryProductRepository();
// const userRepository = new InMemoryUserRepository();
// const orderRepository = new InMemoryOrderRepository();

const pool = createPostgresPool({
    host: "localhost",
    port: 5432,
    database: "eshop",
    user: "eshop",
    password: "eshoppassword123",
});
const shutdown = async (signal: string) => {
    await pool.end();
    process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const cartRepository = new PostgreSQLCartRepository(pool);
const productRepository = new PostgreSQLProductRepository(pool);
const userRepository = new PostgreSQLUserRepository(pool);
const orderRepository = new PostgreSQLOrderRepository(pool);
const cartService = new CartService(cartRepository, productRepository);
const productService = new ProductService(productRepository, cartRepository);
const userService = new UserService(userRepository);
const orderService = new OrderService(orderRepository, productRepository, cartRepository);

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: false }));
// app.use(
//     session({
//         secret: "secret-session-key-7a91fc8203eb23a8",
//         resave: false,
//         saveUninitialized: true,
//     })
// );

const PgSession = connectPgSimple(session);

app.use(
    session({
        store: new PgSession({
            pool,
            tableName: "session",
            createTableIfMissing: true, // optional
        }),
        secret: "secret-session-key-7a91fc8203eb23a8",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
        },
    }),
);

// View setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layout");
app.use(express.static(path.join(__dirname, "static")));

// Middleware to pass user data to views
app.use(async (req: any, res: Response, next: any) => {
    if (req.session.userId) {
        res.locals.userId = req.session.userId;
        res.locals.isLoggedIn = true;

        // Get user data
        const user = await userService.getUserById(req.session.userId);
        res.locals.userName = user?.username || "#" + req.session.userId.substring(0, 8);
        res.locals.userRole = user?.role;

        // Get cart count
        const cartData = await cartService.viewCart(req.session.userId);
        res.locals.cartCount = cartData.items.reduce(
            (sum: number, item: any) => sum + item.quantity,
            0,
        );
    } else {
        res.locals.isLoggedIn = false;
        res.locals.userRole = null;
        res.locals.cartCount = 0;
    }
    next();
});

// Middleware to require login
const requireLogin = (req: any, res: Response, next: any) => {
    if (!req.session.userId) {
        if (req.method === "GET") {
            const returnUrl = encodeURIComponent(req.originalUrl);
            return res.redirect(`/user?return_url=${returnUrl}`);
        } else {
            if (req.method === "POST" && req.originalUrl === "/cart/update") {
                return res.redirect(
                    `/user?return_url=${encodeURIComponent("/product/" + req.body.productId)}`,
                );
            }
            return res.redirect("/user");
        }
    }
    next();
};

// Middleware to require manager role
const requireManager = async (req: any, res: Response, next: any) => {
    if (!req.session.userId) {
        const returnUrl = encodeURIComponent(req.originalUrl);
        return res.redirect(`/user?return_url=${returnUrl}`);
    }

    const user = await userService.getUserById(req.session.userId);
    if (user?.role !== UserRole.Manager) {
        res.locals.title = "Access Denied";
        return res.status(403).render("error", {
            statusCode: 403,
            message:
                "You do not have permission to access this resource. This action is reserved for managers only.",
        });
    }

    next();
};

// Error handling middleware for 4xx errors
const renderError = (req: any, res: Response, statusCode: number, message: string) => {
    res.locals.title = `Error ${statusCode}`;
    return res.status(statusCode).render("error", {
        statusCode,
        message,
    });
};

// Home page redirect
app.get("/", (req: Request, res: Response) => {
    res.redirect("/products");
});

// ===== CART PAGE =====
app.get("/cart", requireLogin, async (req: any, res: Response) => {
    try {
        const cartData = await cartService.viewCart(req.session.userId);
        const total = cartData.items.reduce(
            (sum: number, item: any) => sum + item.product.price * item.quantity,
            0,
        );

        res.locals.title = "My Cart";
        res.render("cart", {
            items: cartData.items,
            total,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading cart");
    }
});

// ===== UPDATE CART ITEM QUANTITY =====
app.post("/cart/update", requireLogin, async (req: any, res: Response) => {
    try {
        if (!req.session.userId) {
            return res.status(403).send("Not authorized");
        }

        const { productId, quantity } = req.body;
        const qty = parseInt(quantity) || 0;

        await cartService.setQuantity(req.session.userId, productId, Math.max(qty, 0));

        res.redirect("/cart");
    } catch (error) {
        console.error(error);
        res.status(500).send("Error updating cart");
    }
});

// ===== PRODUCTS PAGE =====
app.get("/products", async (req: any, res: Response) => {
    try {
        const search = req.query.search ? String(req.query.search).trim() : "";
        let products;
        if (search) {
            const result = await productService.searchProducts(search);
            if (typeof result === "object" && "isSuccess" in result) {
                products = result.isSuccess ? result.value : [];
            } else {
                products = result as any;
            }
        } else {
            products = await productService.listAll();
        }

        let userRole = null;
        if (req.session.userId) {
            const user = await userService.getUserById(req.session.userId);
            userRole = user?.role;
        }

        const cart = req.session.userId ? await cartService.viewCart(req.session.userId) : null;
        const cartMap = new Map(
            cart?.items.map((item: any) => [item.product.id, item.quantity]) || [],
        );

        res.locals.title = "Products" + (search ? ` - Search: ${search}` : "");

        res.render("products", {
            products,
            isManager: userRole === UserRole.Manager,
            cartMap,
            searchQuery: search,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading products");
    }
});

// ===== SINGLE PRODUCT PAGE =====
app.get("/product/:id", async (req: any, res: Response) => {
    try {
        const productResult = await productService.getProductById(req.params.id);
        if (!productResult.isSuccess) {
            return renderError(req, res, 404, "Product not found");
        }
        const product = productResult.value;

        let userRole = null;
        if (req.session.userId) {
            const user = await userService.getUserById(req.session.userId);
            userRole = user?.role;
        }

        const cart = req.session.userId ? await cartService.viewCart(req.session.userId) : null;
        const cartQty =
            cart?.items.find((item: any) => item.product.id === product.id)?.quantity || 0;

        res.locals.title = product.name;
        res.render("product-detail", {
            product,
            isManager: userRole === UserRole.Manager,
            cartQty,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading product");
    }
});

// ===== PRODUCT VERSION PAGE =====
app.get("/productversion/:id", async (req: any, res: Response) => {
    try {
        const versionResult = await productService.getProductVersionById(req.params.id);
        if (!versionResult.isSuccess) {
            return res.status(404).send("Product version not found");
        }
        const productVersion = versionResult.value;

        let userRole = null;
        if (req.session.userId) {
            const user = await userService.getUserById(req.session.userId);
            userRole = user?.role;
        }

        res.locals.title = productVersion.name;
        res.render("productversion", {
            productVersion,
            isManager: userRole === UserRole.Manager,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading product version");
    }
});

// ===== UPDATE PRODUCT (Manager only) =====
app.post("/product/:id", requireManager, async (req: any, res: Response) => {
    try {
        const { name, price, description, imageUrl } = req.body;
        await productService.updateProduct(req.params.id, {
            name,
            price: Math.round(parseFloat(price) * 100),
            description,
            imageUrl,
        });

        res.redirect(`/product/${req.params.id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error updating product");
    }
});

// ===== DELETE PRODUCT (Manager only) =====
app.post("/product/:id/delete", requireManager, async (req: any, res: Response) => {
    try {
        await productService.deleteProduct(req.params.id);
        res.redirect("/products");
    } catch (error) {
        console.error(error);
        res.status(500).send("Error deleting product");
    }
});

// ===== ADD NEW PRODUCT (Manager only) =====
app.post("/products/new", requireManager, async (req: any, res: Response) => {
    try {
        const { name, price, description, imageUrl } = req.body;
        const result = await productService.createProduct(null, {
            name,
            price: Math.round(parseFloat(price) * 100),
            description,
            imageUrl,
        });

        if (!result.isSuccess) {
            return res.status(400).send(result.error);
        }

        res.redirect("/products");
    } catch (error) {
        console.error(error);
        res.status(500).send("Error adding product");
    }
});

// ===== USER PAGE =====
app.get("/user", async (req: any, res: Response) => {
    try {
        if (!req.session.userId) {
            res.locals.title = "Log in to eShop";
            res.locals.returnUrl = req.query.return_url
                ? encodeURIComponent(req.query.return_url)
                : undefined;
            return res.render("user-login", {});
        }

        const user = await userService.getUserById(req.session.userId);
        res.locals.title = "My Profile";

        let allUsers = null;
        if (user?.role === UserRole.Manager) {
            allUsers = await userService.getAllUsers();
        }

        res.render("user-profile", {
            user,
            allUsers,
            profileMessage: req.query.profileMessage || null,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading user page");
    }
});

// ===== LOGIN =====
app.post("/user/login", async (req: any, res: Response) => {
    try {
        const { username, password } = req.body;
        const returnUrl = req.query.return_url || "/products";
        const user = await userService.getUserByUsername(username);

        if (!user) {
            res.locals.title = "Log in to eShop";
            res.locals.loginMessage = "Invalid username";
            res.locals.returnUrl = encodeURIComponent(returnUrl);
            return res.render("user-login", {});
        }

        const isPasswordValid = await user.verifyPassword(password);
        if (!isPasswordValid) {
            res.locals.title = "Log in to eShop";
            res.locals.loginMessage = "Invalid password";
            return res.render("user-login", {});
        }

        req.session.userId = user.id;
        req.session.save((err: any) => {
            if (err) {
                console.error("Session save error:", err);
                return res.status(500).send("Session error");
            }

            res.redirect(returnUrl);
        });
    } catch (error) {
        console.error(error);
        res.locals.title = "Log in to eShop";
        res.locals.loginMessage = "Error during login";
        res.render("user-login", {});
    }
});

// ===== REGISTER =====
app.post("/user/register", async (req: any, res: Response) => {
    try {
        const { username, password, passwordAgain } = req.body;
        const returnUrl = req.query.return_url || "/products";
        const usernameTrimmed = username.trim();
        const existing = await userService.getUserByUsername(usernameTrimmed);

        if (existing) {
            res.locals.title = "Log in to eShop";
            res.locals.loginMessage = `User with username ${usernameTrimmed} already exists`;
            res.locals.returnUrl = encodeURIComponent(returnUrl);
            return res.render("user-login", {});
        }

        if (password.length < 5) {
            res.locals.title = "Log in to eShop";
            res.locals.loginMessage = "Password must be at least 5 characters long";
            res.locals.returnUrl = encodeURIComponent(returnUrl);
            return res.render("user-login", {});
        }

        if (password !== passwordAgain) {
            res.locals.title = "Log in to eShop";
            res.locals.loginMessage = "Passwords do not match";
            res.locals.returnUrl = encodeURIComponent(returnUrl);
            return res.render("user-login", {});
        }

        if (usernameTrimmed.length === 0 || usernameTrimmed.length > 50) {
            res.locals.title = "Log in to eShop";
            res.locals.loginMessage = "Username must be between 1 and 50 characters long";
            res.locals.returnUrl = encodeURIComponent(returnUrl);
            return res.render("user-login", {});
        }

        const user = await userService.registerUser(null, usernameTrimmed, password);
        req.session.userId = user.id;
        req.session.save((err: any) => {
            if (err) {
                console.error("Session save error:", err);
                return res.status(500).send("Session error");
            }

            res.redirect(returnUrl);
        });
    } catch (error) {
        console.error(error);
        res.locals.title = "Log in to eShop";
        res.locals.loginMessage = "Error during registration";
        res.render("user-login", {});
    }
});

// ===== UPDATE USER PROFILE =====
app.post("/user/update", async (req: any, res: Response) => {
    try {
        if (!req.session.userId) {
            return renderError(req, res, 403, "You must be logged in to update your profile.");
        }

        const { username, oldpassword, newpassword, newpasswordagain } = req.body;
        const usernameTrimmed = username ? username.trim() : "";
        const user = await userService.getUserById(req.session.userId);

        if (!usernameTrimmed || usernameTrimmed.length > 50) {
            res.locals.title = "My Profile";
            res.locals.profileMessage = "Username must be between 1 and 50 characters long";
            return res.render("user-profile", { user });
        }

        const existing = await userService.getUserByUsername(usernameTrimmed);

        if (existing && existing.id !== req.session.userId) {
            res.locals.title = "My Profile";
            res.locals.profileMessage = `User with username ${usernameTrimmed} already exists`;
            return res.render("user-profile", { user });
        }

        if (!oldpassword) {
            await userService.updateUser(req.session.userId, username || null, null, null);
            return res.redirect("/user");
        }

        if (newpassword !== newpasswordagain) {
            res.locals.title = "My Profile";
            res.locals.profileMessage = "New passwords do not match";
            return res.render("user-profile", { user });
        }
        if (newpassword && newpassword.length < 5) {
            res.locals.title = "My Profile";
            res.locals.profileMessage = "New password must be at least 5 characters long";
            return res.render("user-profile", { user });
        }
        if (!(await user?.verifyPassword(oldpassword))) {
            res.locals.title = "My Profile";
            res.locals.profileMessage = "Old password is incorrect";
            return res.render("user-profile", { user });
        }

        await userService.updateUser(
            req.session.userId,
            usernameTrimmed || null,
            null,
            newpassword || null,
        );
        res.redirect("/user");
    } catch (error) {
        console.error(error);
        const user = await userService.getUserById(req.session.userId);
        res.locals.title = "My Profile";
        res.locals.profileMessage = "Error updating profile";
        res.render("user-profile", { user });
    }
});

// ===== CHANGE USER ROLE (Manager only) =====
app.post("/user/:id/role", requireManager, async (req: any, res: Response) => {
    try {
        const targetUserId = req.params.id;
        const newRole = req.body.role as UserRole;

        // Validate the role
        if (!Object.values(UserRole).includes(newRole)) {
            return res.status(400).send("Invalid role");
        }

        const targetUser = await userService.getUserById(targetUserId);
        if (!targetUser) {
            return res.status(404).send("User not found");
        }

        // Update the user's role
        await userService.updateUser(targetUserId, null, newRole, null);

        res.redirect("/user");
    } catch (error) {
        console.error(error);
        res.status(500).send("Error changing user role");
    }
});

// ===== LOGOUT =====
app.post("/user/logout", (req: any, res: Response) => {
    req.session.destroy(() => {
        res.redirect("/products");
    });
});

// ===== CHECKOUT PAGE (Order Summary) =====
app.get("/checkout", requireLogin, async (req: any, res: Response) => {
    try {
        const cartData = await cartService.viewCart(req.session.userId);
        const total = cartData.items.reduce(
            (sum: number, item: any) => sum + item.product.price * item.quantity,
            0,
        );

        // Get product versions for each item
        const items = await Promise.all(
            cartData.items.map(async (item: any) => ({
                product: item.product,
                quantity: item.quantity,
            })),
        );

        let currentVersions = "";
        for (const item of cartData.items) {
            const pv = await productRepository.getCurrentVersion(item.product.id);
            if (!pv) {
                await cartService.setQuantity(req.session.userId, item.product.id, 0);
            } else {
                currentVersions += pv.versionId;
            }
        }

        const versionsHash = await hash(currentVersions, 10);

        res.locals.title = "Order Summary";
        res.render("order-summary", {
            items,
            total,
            versionsHash,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading checkout");
    }
});

// ===== CREATE ORDER =====
app.post("/order/create", requireLogin, async (req: any, res: Response) => {
    try {
        const { message, versionsHash } = req.body;

        // Validate product versions haven't changed

        const cartData = await cartService.viewCart(req.session.userId);
        let productDeleted = false;
        let currentVersions = "";
        for (const item of cartData.items) {
            const pv = await productRepository.getCurrentVersion(item.product.id);
            if (!pv) {
                await cartService.setQuantity(req.session.userId, item.product.id, 0);
                productDeleted = true;
            } else {
                currentVersions += pv.versionId;
            }
        }

        const currentHash = await hash(currentVersions, 10);

        const versionsMatch = await compare(currentVersions, versionsHash);

        if (productDeleted || !versionsMatch) {
            res.locals.title = "Order Summary";
            const cartData = await cartService.viewCart(req.session.userId);
            const total = cartData.items.reduce(
                (sum: number, item: any) => sum + item.product.price * item.quantity,
                0,
            );

            const items = await Promise.all(
                cartData.items.map(async (item: any) => ({
                    product: item.product,
                    quantity: item.quantity,
                })),
            );

            res.locals.checkoutError =
                "Some products were modified while you were in checkout. Please review your order.";
            return res.render("order-summary", {
                items,
                total,
                versionsHash: currentHash,
            });
        }

        const orderId = await orderService.createOrderFromCart(req.session.userId, message || "");

        if (!orderId) {
            return res.status(400).send("Error creating order");
        }

        res.redirect("/orders");
    } catch (error) {
        console.error(error);
        res.status(500).send("Error creating order");
    }
});

// ===== ORDERS PAGE =====
app.get("/orders", requireLogin, async (req: any, res: Response) => {
    try {
        const user = await userService.getUserById(req.session.userId);
        const isManager = user?.role === UserRole.Manager;

        let orders;
        const filter = req.query.filter || "my";

        if (!isManager) {
            orders = await orderService.getOrdersByUserId(req.session.userId);
        } else {
            // Manager filters
            if (filter === "all") {
                orders = await orderService.getAllOrders();
            } else if (filter === "delivered") {
                orders = await orderService.getAllDeliveredOrders();
            } else if (filter === "pending") {
                orders = await orderService.getAllPendingOrders();
            } else {
                // default "my"
                orders = await orderService.getOrdersByUserId(req.session.userId);
            }
        }

        // Enhance orders with product details
        const ordersWithDetails = await Promise.all(
            orders.map(async (order) => ({
                ...order,
                username: (await userService.getUserById(order.userId))?.username || "",
                items: (
                    await Promise.all(
                        order.listItems().map(async (item: any) => ({
                            ...item,
                            product: await productRepository.findByVersionId(item.productVersionId),
                        })),
                    )
                ).filter(
                    (item: any): item is { product: NonNullable<typeof item.product> } =>
                        item.product !== null,
                ),
            })),
        );

        res.locals.title = "Orders";
        res.render("orders", {
            orders: ordersWithDetails,
            isManager,
            currentFilter: filter,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading orders");
    }
});

// ===== MARK ORDER AS DELIVERED (Manager only) =====
app.post("/order/:id/deliver", requireManager, async (req: any, res: Response) => {
    try {
        const order = await orderService.getOrderById(req.params.id);
        if (!order) {
            return res.status(404).send("Order not found");
        }

        order.markAsDelivered();
        await orderService.updateDeliveryStatus(req.params.id, order.deliveryStatus);

        const filter = req.body.filter || "my";
        res.redirect(`/orders?filter=${filter}`);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error updating order");
    }
});

// ===== MARK ORDER AS PENDING (Manager only) =====
app.post("/order/:id/pending", requireManager, async (req: any, res: Response) => {
    try {
        const order = await orderService.getOrderById(req.params.id);
        if (!order) {
            return res.status(404).send("Order not found");
        }

        order.markAsPending();
        await orderService.updateDeliveryStatus(req.params.id, order.deliveryStatus);

        const filter = req.body.filter || "my";
        res.redirect(`/orders?filter=${filter}`);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error updating order");
    }
});

// ===== 404 HANDLER (Must be last) =====
app.use((req: Request, res: Response) => {
    res.locals.title = "Page Not Found";
    res.status(404).render("error", {
        statusCode: 404,
        message: "The page you are looking for does not exist.",
    });
});

// Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
