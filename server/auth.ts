import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { users, type User, type RegisterRequest, type LoginRequest } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRES_IN = "7d";

export interface AuthRequest extends Request {
  user?: User;
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  static generateToken(userId: string): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  static verifyToken(token: string): { userId: string } | null {
    try {
      return jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch {
      return null;
    }
  }

  static generateVerificationToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  static async register(data: RegisterRequest): Promise<{ user: Omit<User, 'password'>, token: string }> {
    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    if (existingUser.length > 0) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const hashedPassword = await this.hashPassword(data.password);

    // Create verification token
    const verificationToken = this.generateVerificationToken();

    // Create user
    const [newUser] = await db.insert(users).values({
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      verificationToken,
      emailVerified: false,
    }).returning();

    // Generate JWT token
    const token = this.generateToken(newUser.id);

    // Return user without password
    const { password, ...userWithoutPassword } = newUser;
    return { user: userWithoutPassword, token };
  }

  static async login(data: LoginRequest): Promise<{ user: Omit<User, 'password'>, token: string }> {
    // Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Check password
    const isValidPassword = await this.comparePassword(data.password, user.password);
    if (!isValidPassword) {
      throw new Error("Invalid email or password");
    }

    // Generate JWT token
    const token = this.generateToken(user.id);

    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  static async getUserById(userId: string): Promise<Omit<User, 'password'> | null> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return null;

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static async verifyEmail(token: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.verificationToken, token)).limit(1);
    if (!user) return false;

    await db.update(users)
      .set({ emailVerified: true, verificationToken: null })
      .where(eq(users.id, user.id));

    return true;
  }
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  const decoded = AuthService.verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  const user = await AuthService.getUserById(decoded.userId);
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  req.user = user as User;
  next();
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const decoded = AuthService.verifyToken(token);
    if (decoded) {
      const user = await AuthService.getUserById(decoded.userId);
      if (user) {
        req.user = user as User;
      }
    }
  }

  next();
};