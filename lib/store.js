// Lightweight client-side persistence. Everything lives in the user's browser.
"use client";

const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };

export const getKey = () => safe(() => localStorage.getItem("lf:apikey") || "", "");
export const setKey = (v) => safe(() => localStorage.setItem("lf:apikey", v));

export const getBucket = (k) => safe(() => localStorage.getItem("lf:bucket:" + k) || "", "");
export const setBucket = (k, v) => safe(() => localStorage.setItem("lf:bucket:" + k, v));

export const getOutput = (k) => safe(() => localStorage.getItem("lf:output:" + k) || "", "");
export const setOutput = (k, v) => safe(() => localStorage.setItem("lf:output:" + k, v));

export const getActive = () => safe(() => JSON.parse(localStorage.getItem("lf:active") || '["bmc"]'), ["bmc"]);
export const setActive = (arr) => safe(() => localStorage.setItem("lf:active", JSON.stringify(arr)));

export const getChat = (k) => safe(() => JSON.parse(localStorage.getItem("lf:chat:" + k) || "[]"), []);
export const setChat = (k, log) => safe(() => localStorage.setItem("lf:chat:" + k, JSON.stringify(log.slice(-40))));

export const resetAll = () => safe(() => {
  Object.keys(localStorage).filter(k => k.startsWith("lf:") && k !== "lf:apikey").forEach(k => localStorage.removeItem(k));
});
