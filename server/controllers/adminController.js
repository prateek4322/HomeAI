import { prisma } from "../config/database.js";

const positiveInt = (value, fallback, max = 100) => {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback;
};

export const getAdminDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalUsers, totalProducts, totalAdmins, newUsersToday, expiring, recentUsers] =
      await Promise.all([
        prisma.user.count(),
        prisma.product.count(),
        prisma.user.count({ where: { role: "ADMIN" } }),
        prisma.user.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
        prisma.product.findMany({
          where: { expiryDate: { not: null } },
          select: { expiryDate: true },
        }),
        prisma.user.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, name: true, email: true, role: true, createdAt: true },
        }),
      ]);

    let expiredProducts = 0;
    let expiringSoonProducts = 0;
    for (const item of expiring) {
      const expiry = new Date(item.expiryDate);
      expiry.setHours(0, 0, 0, 0);
      const days = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
      if (days < 0) expiredProducts++;
      else if (days <= 7) expiringSoonProducts++;
    }

    return res.json({
      stats: { totalUsers, totalProducts, totalAdmins, newUsersToday, expiredProducts, expiringSoonProducts },
      recentUsers,
    });
  } catch (error) {
    console.error("ADMIN DASHBOARD ERROR:", error);
    return res.status(500).json({ message: "Unable to load admin dashboard." });
  }
};

export const getAdminUsers = async (req, res) => {
  try {
    const page = positiveInt(req.query.page, 1, 1000000);
    const limit = positiveInt(req.query.limit, 20, 100);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const where = search ? {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    } : {};

    const [total, rows] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit,
        select: {
          id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true,
          _count: { select: { products: true } },
        },
      }),
    ]);
    return res.json({
      users: rows.map(({ _count, ...user }) => ({ ...user, productCount: _count.products })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("ADMIN USERS ERROR:", error);
    return res.status(500).json({ message: "Unable to load users." });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const { role } = req.body;
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid user ID." });
    if (!["USER", "ADMIN"].includes(role)) return res.status(400).json({ message: "Role must be USER or ADMIN." });

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!target) return res.status(404).json({ message: "User not found." });

    if (target.role === "ADMIN" && role === "USER") {
      const count = await prisma.user.count({ where: { role: "ADMIN" } });
      if (count <= 1) return res.status(409).json({ message: "You cannot demote the only remaining admin." });
    }

    const user = await prisma.user.update({
      where: { id }, data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
    return res.json({ message: "User role updated successfully.", user });
  } catch (error) {
    console.error("UPDATE USER ROLE ERROR:", error);
    return res.status(500).json({ message: "Unable to update user role." });
  }
};

export const deleteAdminUser = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid user ID." });
    if (id === req.userId) return res.status(400).json({ message: "You cannot delete your own account from the admin panel." });

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!target) return res.status(404).json({ message: "User not found." });

    if (target.role === "ADMIN") {
      const count = await prisma.user.count({ where: { role: "ADMIN" } });
      if (count <= 1) return res.status(409).json({ message: "You cannot delete the only remaining admin." });
    }
    await prisma.user.delete({ where: { id } }); // Product relation cascades on delete.
    return res.json({ message: "User and associated products deleted." });
  } catch (error) {
    console.error("DELETE ADMIN USER ERROR:", error);
    return res.status(500).json({ message: "Unable to delete user." });
  }
};

export const getAdminProducts = async (req, res) => {
  try {
    const page = positiveInt(req.query.page, 1, 1000000);
    const limit = positiveInt(req.query.limit, 20, 100);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const where = search ? {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ],
    } : {};

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit,
        select: {
          id: true, name: true, brand: true, category: true, quantity: true,
          location: true, expiryDate: true, daysLeft: true, createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);
    return res.json({ products, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("ADMIN PRODUCTS ERROR:", error);
    return res.status(500).json({ message: "Unable to load products." });
  }
};
