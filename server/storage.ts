import { users, floorPlans, type User, type InsertUser, type FloorPlan, type InsertFloorPlan } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Floor plan operations
  getFloorPlan(id: number): Promise<FloorPlan | undefined>;
  getFloorPlansByUser(userId: number): Promise<FloorPlan[]>;
  createFloorPlan(floorPlan: InsertFloorPlan): Promise<FloorPlan>;
  updateFloorPlan(id: number, floorPlan: Partial<InsertFloorPlan>): Promise<FloorPlan | undefined>;
  deleteFloorPlan(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private floorPlans: Map<number, FloorPlan>;
  private currentUserId: number;
  private currentFloorPlanId: number;

  constructor() {
    this.users = new Map();
    this.floorPlans = new Map();
    this.currentUserId = 1;
    this.currentFloorPlanId = 1;
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

  async getFloorPlan(id: number): Promise<FloorPlan | undefined> {
    return this.floorPlans.get(id);
  }

  async getFloorPlansByUser(userId: number): Promise<FloorPlan[]> {
    return Array.from(this.floorPlans.values()).filter(
      (plan) => plan.userId === userId,
    );
  }

  async createFloorPlan(insertFloorPlan: InsertFloorPlan): Promise<FloorPlan> {
    const id = this.currentFloorPlanId++;
    const now = new Date();
    const floorPlan: FloorPlan = { 
      ...insertFloorPlan, 
      id, 
      createdAt: now,
      updatedAt: now
    };
    this.floorPlans.set(id, floorPlan);
    return floorPlan;
  }

  async updateFloorPlan(id: number, updateFloorPlan: Partial<InsertFloorPlan>): Promise<FloorPlan | undefined> {
    const existing = this.floorPlans.get(id);
    if (!existing) return undefined;
    
    const updated: FloorPlan = { 
      ...existing, 
      ...updateFloorPlan, 
      updatedAt: new Date() 
    };
    this.floorPlans.set(id, updated);
    return updated;
  }

  async deleteFloorPlan(id: number): Promise<boolean> {
    return this.floorPlans.delete(id);
  }
}

export const storage = new MemStorage();
