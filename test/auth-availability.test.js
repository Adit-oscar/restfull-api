const test = require("node:test");
const assert = require("node:assert/strict");
const authController = require("../src/controllers/auth");
const authModel = require("../src/models/auth");

const createResponse = () => {
  const res = {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    },
  };

  return res;
};

test("checkAvailability returns 409 when username is already registered", async () => {
  const original = authModel.findUserByUsernameOrEmail;
  authModel.findUserByUsernameOrEmail = async () => [
    { id: 1, username: "alice", email: "alice@example.com" },
  ];

  try {
    const req = {
      body: {
        username: "alice",
        email: "new@example.com",
      },
    };
    const res = createResponse();

    await authController.checkAvailability(req, res);

    assert.equal(res.statusCode, 409);
    assert.equal(res.payload.available, false);
    assert.deepEqual(res.payload.duplicates, ["username"]);
    assert.equal(res.payload.message, "Username already exists");
  } finally {
    authModel.findUserByUsernameOrEmail = original;
  }
});

test("checkAvailability returns 409 when both username and email are already registered", async () => {
  const original = authModel.findUserByUsernameOrEmail;
  authModel.findUserByUsernameOrEmail = async () => [
    { id: 1, username: "alice", email: "alice@example.com" },
  ];

  try {
    const req = {
      body: {
        username: "alice",
        email: "alice@example.com",
      },
    };
    const res = createResponse();

    await authController.checkAvailability(req, res);

    assert.equal(res.statusCode, 409);
    assert.equal(res.payload.available, false);
    assert.deepEqual(res.payload.duplicates, ["username", "email"]);
    assert.equal(res.payload.message, "Username and email already registered");
  } finally {
    authModel.findUserByUsernameOrEmail = original;
  }
});

test("checkAvailability returns 200 when username and email are available", async () => {
  const original = authModel.findUserByUsernameOrEmail;
  authModel.findUserByUsernameOrEmail = async () => [];

  try {
    const req = {
      body: {
        username: "new_user",
        email: "new@example.com",
      },
    };
    const res = createResponse();

    await authController.checkAvailability(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.available, true);
    assert.equal(res.payload.message, "Username and email are available");
  } finally {
    authModel.findUserByUsernameOrEmail = original;
  }
});
