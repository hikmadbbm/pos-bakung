import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default function authRouter({ prisma, JWT_SECRET }) {
  const router = express.Router();

  router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    try {
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.status(401).json({ error: "Invalid credentials" });

      const token = jwt.sign(
        { sub: user.id, role: user.role, name: user.name, username: user.username },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      
      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { last_login: new Date() }
      });

      // Log activity
      await prisma.userActivityLog.create({
        data: {
          user_id: user.id,
          action_type: "LOGIN",
          description: "User logged in via username/password"
        }
      });

      res.json({
        token,
        user: { id: user.id, name: user.name, username: user.username, role: user.role }
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/verify-manager", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Manager credentials required" });
    }
    try {
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.status(401).json({ error: "Invalid credentials" });

      if (user.role !== "MANAGER" && user.role !== "OWNER") {
        return res.status(403).json({ error: "Insufficient permissions. Manager or Owner required." });
      }

      await prisma.userActivityLog.create({
        data: {
          user_id: user.id,
          action_type: "MANAGER_OVERRIDE",
          description: "Authorized Stop Shift"
        }
      });

      res.json({ success: true, manager: { id: user.id, name: user.name } });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/seed-owner", async (req, res) => {
    const { name, username, password, email } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: "Name, username, password required" });
    }
    try {
      const exists = await prisma.user.findUnique({ where: { username } });
      if (exists) return res.status(400).json({ error: "Username already exists" });

      const hash = await bcrypt.hash(password, 10);
      // Create user with OWNER role
      const user = await prisma.user.create({
        data: { name, username, email, password: hash, role: "OWNER", status: "ACTIVE" }
      });
      res.json({ id: user.id, name: user.name, username: user.username, role: user.role });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  return router;
}
