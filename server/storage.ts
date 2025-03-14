import { User, InsertUser, Password, InsertPassword } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const MemoryStore = createMemoryStore(session);
const scryptAsync = promisify(scrypt);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getPasswords(userId: number): Promise<Password[]>;
  getPassword(id: number): Promise<Password | undefined>;
  createPassword(userId: number, password: InsertPassword): Promise<Password>;
  updatePassword(id: number, password: Partial<InsertPassword>): Promise<Password>;
  deletePassword(id: number): Promise<void>;
  
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private passwords: Map<number, Password>;
  private currentUserId: number;
  private currentPasswordId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.passwords = new Map();
    this.currentUserId = 1;
    this.currentPasswordId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getPasswords(userId: number): Promise<Password[]> {
    return Array.from(this.passwords.values()).filter(
      (pwd) => pwd.userId === userId,
    );
  }

  async getPassword(id: number): Promise<Password | undefined> {
    return this.passwords.get(id);
  }

  async createPassword(userId: number, insertPassword: InsertPassword): Promise<Password> {
    const id = this.currentPasswordId++;
    const password: Password = {
      ...insertPassword,
      id,
      userId,
      updatedAt: new Date(),
    };
    this.passwords.set(id, password);
    return password;
  }

  async updatePassword(id: number, updateData: Partial<InsertPassword>): Promise<Password> {
    const existing = this.passwords.get(id);
    if (!existing) {
      throw new Error("Password entry not found");
    }
    
    const updated: Password = {
      ...existing,
      ...updateData,
      updatedAt: new Date(),
    };
    this.passwords.set(id, updated);
    return updated;
  }

  async deletePassword(id: number): Promise<void> {
    this.passwords.delete(id);
  }
}

export const storage = new MemStorage();
