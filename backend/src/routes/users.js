
import express from "express";
import bcrypt from "bcryptjs";

export default function usersRouter({ prisma }) {
  const router = express.Router();

  // GET /api/users
  router.get("/", async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          status: true,
          phone_number: true,
          last_login: true,
          created_at: true,
          // Exclude password and pin for security
        }
      });
      res.json(users);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // GET /api/users/:id
  router.get("/:id", async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(req.params.id) },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          status: true,
          phone_number: true,
          employee_id: true,
          notes: true,
          last_login: true,
          created_at: true
        }
      });
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // POST /api/users
  router.post("/", async (req, res) => {
    const { name, username, email, password, role, pin, phone_number, employee_id, notes } = req.body;
    
    if (!name || !username || !password || !role) {
      return res.status(400).json({ error: "Name, username, password, and role are required" });
    }

    try {
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) return res.status(400).json({ error: "Username already exists" });

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await prisma.user.create({
        data: {
          name,
          username,
          email,
          password: hashedPassword,
          role,
          pin,
          phone_number,
          employee_id,
          notes,
          status: "ACTIVE"
        },
        select: { id: true, name: true, username: true, email: true, role: true }
      });
      
      // Log activity
      await prisma.userActivityLog.create({
        data: {
          user_id: user.id, // Ideally creator ID, but context needed
          action_type: "USER_CREATED",
          description: `User ${user.name} created`
        }
      });

      res.json(user);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // PUT /api/users/:id
  router.put("/:id", async (req, res) => {
    const { name, username, email, role, pin, phone_number, status, employee_id, notes } = req.body;
    const userId = parseInt(req.params.id);

    try {
      // Check username uniqueness if changing
      if (username) {
        const existing = await prisma.user.findFirst({
          where: { username, NOT: { id: userId } }
        });
        if (existing) return res.status(400).json({ error: "Username already exists" });
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          name,
          username,
          email,
          role,
          // Only update PIN if provided and not empty
          ...(pin && pin.trim() !== "" ? { pin } : {}),
          phone_number,
          status,
          employee_id,
          notes
        },
        select: { id: true, name: true, username: true, email: true, role: true, status: true }
      });
      res.json(user);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // POST /api/users/:id/reset-password
  router.post("/:id/reset-password", async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ error: "New password required" });

    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: parseInt(req.params.id) },
        data: { password: hashedPassword }
      });
      res.json({ message: "Password updated successfully" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  return router;
}
