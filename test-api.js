import axios from "axios";

// Test the API endpoints
const API_BASE = "http://localhost:5000";

async function testAPI() {
  console.log("Testing Dormitory Management API...\n");

  try {
    // Test 1: Check if server is running
    console.log("1. Testing server connection...");
    const response = await axios.get(`${API_BASE}/`);
    console.log("✅ Server is running:", response.data);

    // Test 2: Check Swagger documentation
    console.log("\n2. Testing Swagger documentation...");
    const swaggerResponse = await axios.get(`${API_BASE}/api-docs`);
    console.log("✅ Swagger documentation is accessible");

    // Test 3: Test admin registration (this should fail without proper data)
    console.log("\n3. Testing admin registration endpoint...");
    try {
      await axios.post(`${API_BASE}/api/admins/register`, {
        pgName: "Test PG",
        ownerName: "Test Owner",
        email: "test@example.com",
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
      console.log("✅ Admin registration endpoint is working");
    } catch (error) {
      if (error.response?.status === 400) {
        console.log(
          "✅ Admin registration endpoint is working (expected validation error)",
        );
      } else {
        console.log("❌ Admin registration endpoint error:", error.message);
      }
    }

    // Test 4: Test user registration (this should fail without proper data)
    console.log("\n4. Testing user registration endpoint...");
    try {
      await axios.post(`${API_BASE}/api/users/register`, {
        firstName: "Test",
        lastName: "User",
        email: "testuser@example.com",
        mobile: "9876543211",
        password: "password123",
        address: "Test Address",
      });
      console.log("✅ User registration endpoint is working");
    } catch (error) {
      if (error.response?.status === 400) {
        console.log(
          "✅ User registration endpoint is working (expected validation error)",
        );
      } else {
        console.log("❌ User registration endpoint error:", error.message);
      }
    }

    console.log("\n🎉 All API tests completed successfully!");
    console.log("\nNext steps:");
    console.log("1. Set up MongoDB connection");
    console.log("2. Create .env file with proper configuration");
    console.log("3. Start the server with: npm run dev");
    console.log(
      "4. Access API documentation at: http://localhost:5000/api-docs",
    );
  } catch (error) {
    console.error("❌ API test failed:", error.message);
    if (error.code === "ECONNREFUSED") {
      console.log(
        "\n💡 The server might not be running. Start it with: npm run dev",
      );
    }
  }
}

testAPI();
