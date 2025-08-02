import { pgTable, text, serial, integer, boolean, json, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const floorPlans = pgTable("floor_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id").references(() => users.id),
  originalFileName: text("original_file_name"),
  scale: real("scale").notNull().default(1.0),
  unit: text("unit", { enum: ["mm", "cm", "m", "ft", "in"] }).notNull().default("m"),
  bounds: json("bounds").notNull(),
  walls: json("walls").notNull(),
  rooms: json("rooms").notNull(),
  restrictedAreas: json("restricted_areas").notNull(),
  entrances: json("entrances").notNull(),
  ilots: json("ilots").notNull(),
  corridors: json("corridors").notNull(),
  totalArea: real("total_area").notNull(),
  availableArea: real("available_area").notNull(),
  processingConfig: json("processing_config"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertFloorPlanSchema = createInsertSchema(floorPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type FloorPlan = typeof floorPlans.$inferSelect;
export type InsertFloorPlan = z.infer<typeof insertFloorPlanSchema>;
