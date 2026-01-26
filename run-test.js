#!/usr/bin/env node

const { runTests } = require("./test-api.js");

console.log("🧪 Running API Authentication Test...\n");

runTests()
  .then(() => {
    console.log("\n🎉 Test completed! Check the output above for results.");
  })
  .catch((error) => {
    console.error("❌ Test failed with error:", error);
    process.exit(1);
  });
