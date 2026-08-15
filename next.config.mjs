export default {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  // Keep the fictional intake files in the `/` server bundle so `/?demo=`
  // can read them on Vercel. BIC profiles and brief fixtures stay out.
  outputFileTracingIncludes: {
    "/": [
      "./demo-data/coffee/driftline-biz.md",
      "./demo-data/coffee/driftline-leadership-interviews.md",
      "./demo-data/coffee/driftline-calls.md",
      "./demo-data/coffee/driftline-org.md",
      "./demo-data/garage-doors/ironwood-biz.md",
      "./demo-data/garage-doors/ironwood-leadership-interviews.md",
      "./demo-data/garage-doors/ironwood-calls.md",
      "./demo-data/garage-doors/ironwood-org.md",
      "./demo-data/saas/quartermast-biz.md",
      "./demo-data/saas/quartermast-leadership-interviews.md",
      "./demo-data/saas/quartermast-calls.md",
      "./demo-data/saas/quartermast-org.md",
    ],
  },
};
