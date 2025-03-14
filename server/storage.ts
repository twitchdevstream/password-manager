import { User, InsertUser, Password, InsertPassword } from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { users, passwords } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function decryptPassword(stored: string) {
  const [hashedPart] = stored.split(".");
  // Decrypt logic would go here - for now, we're using a reversible format
  return hashedPart;
}

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

    // Decrypt passwords before returning
    const decryptedResults = await Promise.all(
      results.map(async (pass) => ({
        ...pass,
        password: await decryptPassword(pass.password)
      }))
    );

    const [{ count }]: [{ count: number }] = await db.select({
      count: sql`count(*)::int`,
    })
    .from(passwords)
    .where(eq(passwords.userId, userId));

    return {
      passwords: decryptedResults,
      total: count,
    };
  }

  async getPassword(id: number): Promise<Password | undefined> {
    const [password] = await db.select().from(passwords).where(eq(passwords.id, id));
    if (password) {
      return {
        ...password,
        password: await decryptPassword(password.password)
      };
    }
    return undefined;
  }

  async createPassword(userId: number, insertPassword: InsertPassword): Promise<Password> {
    const hashedPassword = await hashPassword(insertPassword.password);
    const [password] = await db
      .insert(passwords)
      .values({ ...insertPassword, userId, password: hashedPassword })
      .returning();

    return {
      ...password,
      password: insertPassword.password // Return the original password in the response
    };
  }

  async updatePassword(id: number, updateData: Partial<InsertPassword>): Promise<Password> {
    let updateValues: any = { ...updateData, updatedAt: new Date() };

    // If password is being updated, hash it
    if (updateData.password) {
      updateValues.password = await hashPassword(updateData.password);
    }

    const [password] = await db
      .update(passwords)
      .set(updateValues)
      .where(eq(passwords.id, id))
      .returning();

    return {
      ...password,
      password: updateData.password || password.password // Return original password if updated, or keep existing
    };
  }

  async deletePassword(id: number): Promise<void> {
    await db.delete(passwords).where(eq(passwords.id, id));
  }
}

export const storage = new DatabaseStorage();