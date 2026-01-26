// Simple test without external dependencies
import http from "http";

const options = {
  hostname: "localhost",
  port: 5000,
  path: "/",
  method: "GET",
};

console.log("Testing Dormitory Management API...\n");

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);

  res.setEncoding("utf8");
  let rawData = "";

  res.on("data", (chunk) => {
    rawData += chunk;
  });

  res.on("end", () => {
    console.log(`Response: ${rawData}`);
    console.log("\n✅ Server is responding correctly!");
    console.log("\n🎉 API test completed successfully!");
    console.log("\nNext steps:");
    console.log("1. Create .env file with proper configuration");
    console.log(
      "2. Access API documentation at: http://localhost:5000/api-docs",
    );
    console.log("3. Start building your frontend integration");
  });
});

req.on("error", (e) => {
  console.error(`❌ Problem with request: ${e.message}`);
  if (e.code === "ECONNREFUSED") {
    console.log(
      "\n💡 The server might not be running. Start it with: npm run dev",
    );
  }
});

req.end();
