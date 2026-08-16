import test from "node:test";
import assert from "node:assert/strict";
import { httpUrl, playerLinkUrl } from "../lib/playerLinks.js";

test("only real http(s) URLs become player links", () => {
  assert.equal(httpUrl("https://stripe.com"), "https://stripe.com/");
  assert.equal(httpUrl("http://example.com/path"), "http://example.com/path");
  assert.equal(httpUrl("stripe.com"), "");
  assert.equal(httpUrl("javascript:alert(1)"), "");
  assert.equal(httpUrl(""), "");
});

test("player url wins; otherwise a matching evidence title may supply the link", () => {
  const player = { name: "Stripe", url: "https://stripe.com" };
  assert.equal(playerLinkUrl(player, []), "https://stripe.com/");

  const fromEvidence = playerLinkUrl(
    { name: "AppDirect" },
    [{ title: "AppDirect", url: "https://www.appdirect.com" }],
  );
  assert.equal(fromEvidence, "https://www.appdirect.com/");
});

test("do not invent a domain from the competitor name", () => {
  assert.equal(playerLinkUrl({ name: "AppDirect" }, []), "");
  assert.equal(playerLinkUrl({ name: "AppDirect" }, [{ title: "Marketplace overview", url: "https://www.appdirect.com" }]), "");
  assert.equal(playerLinkUrl({ name: "AppDirect", url: "appdirect.com" }, []), "");
});
