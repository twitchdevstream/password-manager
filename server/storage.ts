import { User, InsertUser, Password, InsertPassword } from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { users, passwords } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getPasswords(userId: number, page: number, limit: number): Promise<{passwords: Password[], total: number}>;
  getPassword(id: number): Promise<Password | undefined>;
  createPassword(userId: number, password: InsertPassword): Promise<Password>;
  updatePassword(id: number, password: Partial<InsertPassword>): Promise<Password>;
  deletePassword(id: number): Promise<void>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getPasswords(userId: number, page: number = 1, limit: number = 10): Promise<{passwords: Password[], total: number}> {
    const offset = (page - 1) * limit;

    const results = await db.select().from(passwords)
      .where(eq(passwords.userId, userId))
      .limit(limit)
      .offset(offset);

    const [{ count }]: [{ count: number }] = await db.select({
      count: sql`count(*)::int`,
    })
    .from(passwords)
    .where(eq(passwords.userId, userId));

    return {
      passwords: results,
      total: count,
    };
  }

  async getPassword(id: number): Promise<Password | undefined> {
    const [password] = await db.select().from(passwords).where(eq(passwords.id, id));
    return password;
  }

  async createPassword(userId: number, insertPassword: InsertPassword): Promise<Password> {
    const [password] = await db
      .insert(passwords)
      .values({ ...insertPassword, userId })
      .returning();
    return password;
  }

  async updatePassword(id: number, updateData: Partial<InsertPassword>): Promise<Password> {
    const [password] = await db
      .update(passwords)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(passwords.id, id))
      .returning();
    return password;
  }

  async deletePassword(id: number): Promise<void> {
    await db.delete(passwords).where(eq(passwords.id, id));
  }
}

export const storage = new DatabaseStorage();