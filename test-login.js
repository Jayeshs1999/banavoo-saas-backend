// Test login functionality
import http from "http";

console.log("🧪 Testing Admin Login Functionality...\n");

// Test 1: Register a new admin
console.log("1. Testing admin registration...");
const registerOptions = {
  hostname: "localhost",
  port: 5000,
  path: "/api/admins/register",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
};

const registerData = JSON.stringify({
  pgName: "Test PG",
  ownerName: "Test Owner",
  email: "testadmin@example.com",
  mobile: "9876543210",
  password: "password123",
  address: {
    area: "Test Area",
    landmark: "Test Landmark",
    city: "Test City",
    pincode: "400001",
    state: "Test State",
  },
});

const registerReq = http.request(registerOptions, (res) => {
  console.log(`Registration Status: ${res.statusCode}`);

  let rawData = "";
  res.on("data", (chunk) => {
    rawData += chunk;
  });

  res.on("end", () => {
    try {
      const response = JSON.parse(rawData);
      if (res.statusCode === 201) {
        console.log("✅ Admin registration successful!");
        console.log("📋 Admin ID:", response._id);

        // Test 2: Login with the registered admin
        console.log("\n2. Testing admin login...");
        testLogin();
      } else {
        console.log("❌ Registration failed:", response.message || rawData);
      }
    } catch (error) {
      console.log("❌ Registration response error:", error.message);
    }
  });
});

registerReq.on("error", (e) => {
  console.error("❌ Registration error:", e.message);
});

registerReq.write(registerData);
registerReq.end();

function testLogin() {
  const loginOptions = {
    hostname: "localhost",
    port: 5000,
    path: "/api/admins/auth",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  };

  const loginData = JSON.stringify({
    email: "testadmin@example.com",
    password: "password123",
  });

  const loginReq = http.request(loginOptions, (res) => {
    console.log(`Login Status: ${res.statusCode}`);

    let rawData = "";
    res.on("data", (chunk) => {
      rawData += chunk;
    });

    res.on("end", () => {
      try {
        const response = JSON.parse(rawData);
        if (res.statusCode === 200) {
          console.log("✅ Admin login successful!");
          console.log("📋 Admin Name:", response.ownerName);
          console.log("📧 Admin Email:", response.email);
          console.log("🏢 PG Name:", response.pgName);
          console.log(
            "\n🎉 All tests passed! Login functionality is working correctly.",
          );
        } else {
          console.log("❌ Login failed:", response.message || rawData);
        }
      } catch (error) {
        console.log("❌ Login response error:", error.message);
      }
    });
  });

  loginReq.on("error", (e) => {
    console.error("❌ Login error:", e.message);
  });

  loginReq.write(loginData);
  loginReq.end();
}
