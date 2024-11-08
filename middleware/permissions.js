// Define allowed actions for each role
const rolePermissions = {
 SuperAdmin: ["manageUsers", "manageProducts", "manageOrders"],
 ProductAdmin: ["manageProducts"], // Product Admins can only manage products
 // Add other roles and their permissions as needed
};

module.exports = rolePermissions;
