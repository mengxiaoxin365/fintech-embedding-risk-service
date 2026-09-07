import assert from "node:assert/strict";
import { decide } from "../src/payment_workflow.js";

const payment = { id: "pay_9", amount: 12000, currency: "USD", merchant: "Market", memo: "settlement" };
const result = decide(payment, "normal merchant history");
assert.equal(result.action, "review");
assert.equal(result.audit, "pay_9:review");
console.log("risk decision test passed");
