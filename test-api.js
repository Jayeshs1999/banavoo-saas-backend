const axios = require("axios");

// Base URL for your API
const BASE_URL = "http://localhost:5000";

// Test admin registration
async function testAdminRegistration() {
  console.log("Testing Admin Registration...");

  const adminData = {
    pgName: "Test PG",
    ownerName: "Test Owner",
    email: "test@example.com",
    mobile: "9876543210",
    password: "test123",
    address: {
      area: "Test Area",
      landmark: "Test Landmark",
      city: "Test City",
      pincode: "400001",
      state: "Test State",
    },
  };

  try {
    const response = await axios.post(
      `${BASE_URL}/api/admins/register`,
      adminData,
    );
    console.log("✅ Admin Registration Success:");
    console.log("Token:", response.data.token);
    return response.data.token;
  } catch (error) {
    if (
      error.response?.status === 400 &&
      error.response.data.message.includes("already exists")
    ) {
      console.log("⚠️  Admin already exists, trying login...");
      return testAdminLogin();
    } else {
      console.error(
        "❌ Admin Registration Failed:",
        error.response?.data || error.message,
      );
      return null;
    }
  }
}

// Test admin login
async function testAdminLogin() {
  console.log("Testing Admin Login...");

  const loginData = {
    email: "test@example.com",
    password: "test123",
  };

  try {
    const response = await axios.post(`${BASE_URL}/api/admins/auth`, loginData);
    console.log("✅ Admin Login Success:");
    console.log("Token:", response.data.token);
    return response.data.token;
  } catch (error) {
    console.error(
      "❌ Admin Login Failed:",
      error.response?.data || error.message,
    );
    return null;
  }
}

// Test PG creation with token
async function testPGCreation(token) {
  console.log("Testing PG Creation...");

  const pgData = {
    name: "Test PG",
    photos: ["https://example.com/photo1.jpg"],
    structure: [
      {
        id: "room1",
        name: "Deluxe Room",
        beds: [
          {
            id: "bed1",
            price: 5000,
          },
          {
            id: "bed2",
            price: 5000,
          },
        ],
        price: 8000,
        pricingPeriod: "month",
      },
    ],
    onlinePayment: true,
    location: {
      subcity: "Test Subcity",
      city: "Test City",
      state: "Test State",
      country: "India",
    },
  };

  try {
    const response = await axios.post(`${BASE_URL}/api/pgs`, pgData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log("✅ PG Creation Success:");
    console.log("PG ID:", response.data._id);
    return response.data._id;
  } catch (error) {
    console.error(
      "❌ PG Creation Failed:",
      error.response?.data || error.message,
    );
    return null;
  }
}

// Test getting PGs with token
async function testGetPGs(token) {
  console.log("Testing Get PGs...");

  try {
    const response = await axios.get(`${BASE_URL}/api/pgs`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log("✅ Get PGs Success:");
    console.log("Number of PGs:", response.data.length);
    return response.data;
  } catch (error) {
    console.error("❌ Get PGs Failed:", error.response?.data || error.message);
    return null;
  }
}

// Main test function
async function runTests() {
  console.log("🚀 Starting API Tests...\n");

  // Test 1: Get admin token
  let token = await testAdminRegistration();
  if (!token) {
    console.log("❌ Could not get admin token. Exiting tests.");
    return;
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 2: Create PG
  let pgId = await testPGCreation(token);
  if (!pgId) {
    console.log("❌ Could not create PG. Skipping remaining tests.");
    return;
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 3: Get PGs
  await testGetPGs(token);

  console.log("\n✅ All tests completed!");
  console.log("\n📝 To test manually in Swagger UI:");
  console.log("1. Go to http://localhost:5000/api-docs");
  console.log('2. Click "Authorize" button');
  console.log("3. Enter: Bearer " + token);
  console.log("4. Test any PG endpoint!");
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  testAdminRegistration,
  testAdminLogin,
  testPGCreation,
  testGetPGs,
};
