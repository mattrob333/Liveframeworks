import test from "node:test";
import assert from "node:assert/strict";
import { trapModalTabKey } from "../lib/modalFocus.js";

function fixture() {
  const focused = [];
  const elements = ["first", "middle", "last"].map(name => ({
    name,
    focus: () => focused.push(name),
  }));
  const root = {
    querySelectorAll: () => elements,
    contains: element => elements.includes(element),
    focus: () => focused.push("root"),
  };
  const event = (shiftKey = false) => ({
    key: "Tab",
    shiftKey,
    prevented: false,
    preventDefault() { this.prevented = true; },
  });
  return { elements, event, focused, root };
}

test("mobile modal wraps forward Tab from the last control", () => {
  const { elements, event, focused, root } = fixture();
  const keyEvent = event();
  assert.equal(trapModalTabKey(keyEvent, root, elements[2]), true);
  assert.equal(keyEvent.prevented, true);
  assert.deepEqual(focused, ["first"]);
});

test("mobile modal wraps reverse Tab from the first control", () => {
  const { elements, event, focused, root } = fixture();
  const keyEvent = event(true);
  assert.equal(trapModalTabKey(keyEvent, root, elements[0]), true);
  assert.equal(keyEvent.prevented, true);
  assert.deepEqual(focused, ["last"]);
});

test("mobile modal captures focus that starts outside the dialog", () => {
  const { event, focused, root } = fixture();
  const keyEvent = event();
  assert.equal(trapModalTabKey(keyEvent, root, { name: "background" }), true);
  assert.equal(keyEvent.prevented, true);
  assert.deepEqual(focused, ["first"]);
});
