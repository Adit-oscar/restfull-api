const assert = require("node:assert/strict");
const test = require("node:test");

const databasePath = require.resolve("../src/config/database.js");
const modelPath = require.resolve("../src/models/transaction.js");

const createFakeDatabase = (initialState = {}) => {
  const state = {
    nextTransactionId: 1,
    transactions: new Map(),
    items: new Map(),
    products: new Map(),
    queries: [],
    lockProductIds: [],
    ...initialState,
  };

  const execute = async (sql, params) => {
    const normalizedSql = sql.replace(/\s+/g, " ").trim();
    state.queries.push(normalizedSql);

    if (normalizedSql.startsWith("SELECT id, name, price, stock")) {
      state.lockProductIds.push(params[0]);
      const product = state.products.get(params[0]);
      return [product ? [{ ...product }] : []];
    }
    if (normalizedSql.startsWith("INSERT INTO transactions")) {
      const id = state.nextTransactionId++;
      state.transactions.set(id, {
        id,
        user_id: params[0],
        order_id: params[1],
        total_amount: params[2],
        status: "pending",
        payment_status: "pending",
      });
      return [{ insertId: id }];
    }
    if (normalizedSql.startsWith("INSERT INTO transaction_items")) {
      const [transactionId, productId, quantity, price] = params;
      const items = state.items.get(transactionId) || [];
      items.push({ product_id: productId, quantity, price });
      state.items.set(transactionId, items);
      return [{ affectedRows: 1 }];
    }
    if (normalizedSql.includes("reserved_stock = reserved_stock +")) {
      const product = state.products.get(params[1]);
      product.reserved_stock += params[0];
      return [{ affectedRows: 1 }];
    }
    if (normalizedSql.startsWith("SELECT id, status FROM transactions")) {
      const transaction = [...state.transactions.values()].find(
        (value) =>
          (normalizedSql.includes("WHERE id = ?")
            ? value.id
            : value.order_id) === params[0],
      );
      return [
        transaction ? [{ id: transaction.id, status: transaction.status }] : [],
      ];
    }
    if (
      normalizedSql.startsWith(
        "SELECT product_id, quantity FROM transaction_items",
      )
    ) {
      const items = [...(state.items.get(params[0]) || [])];
      if (normalizedSql.includes("ORDER BY product_id")) {
        items.sort((left, right) => left.product_id - right.product_id);
      }
      return [
        items.map(({ product_id, quantity }) => ({ product_id, quantity })),
      ];
    }
    if (
      normalizedSql.startsWith("UPDATE products SET reserved_stock = GREATEST")
    ) {
      const product = state.products.get(params[1]);
      product.reserved_stock = Math.max(0, product.reserved_stock - params[0]);
      return [{ affectedRows: 1 }];
    }
    if (normalizedSql.startsWith("UPDATE products SET stock = stock -")) {
      const [quantity, reservedQuantity, productId] = params;
      const product = state.products.get(productId);
      if (
        product.stock < quantity ||
        product.reserved_stock < reservedQuantity
      ) {
        return [{ affectedRows: 0 }];
      }
      product.stock -= quantity;
      product.reserved_stock -= reservedQuantity;
      return [{ affectedRows: 1 }];
    }
    if (normalizedSql.startsWith("UPDATE transactions SET payment_token")) {
      const transaction = state.transactions.get(params[1]);
      if (transaction && transaction.status === "pending") {
        transaction.payment_token = params[0];
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 0 }];
    }
    if (normalizedSql.startsWith("UPDATE transactions SET status = 'paid'")) {
      const transaction = state.transactions.get(params[0]);
      transaction.status = "paid";
      transaction.payment_status = "paid";
      return [{ affectedRows: 1 }];
    }
    if (normalizedSql.startsWith("UPDATE transactions SET status = 'failed'")) {
      const transaction = state.transactions.get(params[0]);
      transaction.status = "failed";
      transaction.payment_status = "failed";
      return [{ affectedRows: 1 }];
    }
    if (
      normalizedSql.startsWith("UPDATE transactions SET status = 'refunded'")
    ) {
      const transaction = state.transactions.get(params[0]);
      transaction.status = "refunded";
      transaction.payment_status = "refunded";
      return [{ affectedRows: 1 }];
    }
    if (
      normalizedSql.startsWith(
        "UPDATE transactions SET status = ?, payment_status",
      )
    ) {
      const transaction = state.transactions.get(params[2]);
      if (transaction.status !== "pending") return [{ affectedRows: 0 }];
      transaction.status = params[0];
      transaction.payment_status = params[1];
      return [{ affectedRows: 1 }];
    }
    if (normalizedSql.startsWith("UPDATE transactions SET payment_status")) {
      return [{ affectedRows: 1 }];
    }
    throw new Error(`Unhandled SQL in fake database: ${normalizedSql}`);
  };

  const connection = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    execute,
  };

  return {
    ...state,
    getConnection: async () => connection,
    execute,
  };
};

const loadModel = (database) => {
  delete require.cache[modelPath];
  require.cache[databasePath] = {
    id: databasePath,
    filename: databasePath,
    loaded: true,
    exports: database,
  };
  return require(modelPath);
};

const product = (id, stock = 10, reservedStock = 0) => ({
  id,
  name: `Product ${id}`,
  price: 100,
  stock,
  reserved_stock: reservedStock,
});

test("reserves stock atomically and locks products in deterministic order", async () => {
  const database = createFakeDatabase({
    products: new Map([
      [1, product(1)],
      [2, product(2)],
    ]),
  });
  const model = loadModel(database);

  await model.createPendingTransaction({
    userId: 1,
    orderId: "ORDER-1",
    totalAmount: 200,
    items: [
      { productId: 2, quantity: 1, price: 100 },
      { productId: 1, quantity: 1, price: 100 },
    ],
    paymentExpiry: new Date(),
  });

  const lockQueries = database.queries.filter((query) =>
    query.startsWith("SELECT id, name, price, stock"),
  );
  assert.deepEqual(database.lockProductIds, [1, 2]);
  assert.equal(lockQueries.length, 2);
  assert.equal(database.products.get(1).reserved_stock, 1);
  assert.equal(database.products.get(2).reserved_stock, 1);
});

test("rejects insufficient available stock without creating an order", async () => {
  const database = createFakeDatabase({
    products: new Map([[1, product(1, 2, 2)]]),
  });
  const model = loadModel(database);

  await assert.rejects(
    model.createPendingTransaction({
      userId: 1,
      orderId: "ORDER-2",
      totalAmount: 100,
      items: [{ productId: 1, quantity: 1, price: 100 }],
      paymentExpiry: new Date(),
    }),
    (error) => error.statusCode === 400,
  );
  assert.equal(database.transactions.size, 0);
  assert.equal(database.products.get(1).reserved_stock, 2);
});

test("does not release stock when cancellation loses to a paid transaction", async () => {
  const database = createFakeDatabase({
    transactions: new Map([
      [
        7,
        { id: 7, order_id: "ORDER-7", status: "paid", payment_status: "paid" },
      ],
    ]),
    items: new Map([[7, [{ product_id: 1, quantity: 2 }]]]),
    products: new Map([[1, product(1, 8, 2)]]),
  });
  const model = loadModel(database);

  assert.equal(await model.cancelPendingTransaction(7), false);
  assert.equal(database.products.get(1).reserved_stock, 2);
  assert.equal(database.transactions.get(7).status, "paid");
});

test("cancellation releases pending reservations and changes status", async () => {
  const database = createFakeDatabase({
    transactions: new Map([
      [
        8,
        {
          id: 8,
          order_id: "ORDER-8",
          status: "pending",
          payment_status: "pending",
        },
      ],
    ]),
    items: new Map([[8, [{ product_id: 1, quantity: 2 }]]]),
    products: new Map([[1, product(1, 8, 2)]]),
  });
  const model = loadModel(database);

  assert.equal(await model.cancelPendingTransaction(8), true);
  assert.equal(database.products.get(1).reserved_stock, 0);
  assert.equal(database.transactions.get(8).status, "failed");
});

test("payment success consumes reserved stock exactly once", async () => {
  const database = createFakeDatabase({
    transactions: new Map([
      [
        9,
        {
          id: 9,
          order_id: "ORDER-9",
          status: "pending",
          payment_status: "pending",
        },
      ],
    ]),
    items: new Map([[9, [{ product_id: 1, quantity: 2 }]]]),
    products: new Map([[1, product(1, 10, 2)]]),
  });
  const model = loadModel(database);

  assert.equal(await model.applyPaymentStatus("ORDER-9", "paid"), "processed");
  assert.equal(
    await model.applyPaymentStatus("ORDER-9", "paid"),
    "already_processed",
  );
  assert.deepEqual(database.products.get(1), product(1, 8, 0));
});

test("payment failure releases pending stock and duplicate failure is harmless", async () => {
  const database = createFakeDatabase({
    transactions: new Map([
      [
        10,
        {
          id: 10,
          order_id: "ORDER-10",
          status: "pending",
          payment_status: "pending",
        },
      ],
    ]),
    items: new Map([[10, [{ product_id: 1, quantity: 3 }]]]),
    products: new Map([[1, product(1, 10, 3)]]),
  });
  const model = loadModel(database);

  assert.equal(
    await model.applyPaymentStatus("ORDER-10", "expired"),
    "processed",
  );
  assert.equal(
    await model.applyPaymentStatus("ORDER-10", "expired"),
    "already_processed",
  );
  assert.equal(database.products.get(1).reserved_stock, 0);
  assert.equal(database.transactions.get(10).status, "expired");
});

test("rejects payment when reserved stock is no longer available", async () => {
  const database = createFakeDatabase({
    transactions: new Map([
      [
        11,
        {
          id: 11,
          order_id: "ORDER-11",
          status: "pending",
          payment_status: "pending",
        },
      ],
    ]),
    items: new Map([[11, [{ product_id: 1, quantity: 2 }]]]),
    products: new Map([[1, product(1, 1, 1)]]),
  });
  const model = loadModel(database);

  await assert.rejects(model.applyPaymentStatus("ORDER-11", "paid"));
  assert.equal(database.transactions.get(11).status, "pending");
});

test("handles missing orders and valid payment status transitions", async () => {
  const database = createFakeDatabase({
    transactions: new Map([
      [
        12,
        {
          id: 12,
          order_id: "ORDER-12",
          status: "paid",
          payment_status: "paid",
        },
      ],
      [
        13,
        {
          id: 13,
          order_id: "ORDER-13",
          status: "pending",
          payment_status: "pending",
        },
      ],
    ]),
    items: new Map([[12, [{ product_id: 1, quantity: 1 }]]]),
    products: new Map([[1, product(1, 10, 0)]]),
  });
  const model = loadModel(database);

  assert.equal(await model.applyPaymentStatus("MISSING", "paid"), "not_found");
  assert.equal(
    await model.applyPaymentStatus("ORDER-12", "refunded"),
    "processed",
  );
  assert.equal(database.transactions.get(12).status, "refunded");
  assert.equal(
    await model.applyPaymentStatus("ORDER-13", "pending"),
    "processed",
  );
  assert.equal(database.transactions.get(13).status, "pending");
});
