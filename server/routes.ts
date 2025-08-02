import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFloorPlanSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Floor plan routes
  
  // Get all floor plans for a user
  app.get("/api/floorplans/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      const floorPlans = await storage.getFloorPlansByUser(userId);
      res.json(floorPlans);
    } catch (error) {
      console.error("Error fetching floor plans:", error);
      res.status(500).json({ error: "Failed to fetch floor plans" });
    }
  });

  // Get a specific floor plan
  app.get("/api/floorplan/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid floor plan ID" });
      }
      
      const floorPlan = await storage.getFloorPlan(id);
      if (!floorPlan) {
        return res.status(404).json({ error: "Floor plan not found" });
      }
      
      res.json(floorPlan);
    } catch (error) {
      console.error("Error fetching floor plan:", error);
      res.status(500).json({ error: "Failed to fetch floor plan" });
    }
  });

  // Create a new floor plan
  app.post("/api/floorplan", async (req, res) => {
    try {
      const validatedData = insertFloorPlanSchema.parse(req.body);
      const floorPlan = await storage.createFloorPlan(validatedData);
      res.status(201).json(floorPlan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid floor plan data", details: error.errors });
      }
      console.error("Error creating floor plan:", error);
      res.status(500).json({ error: "Failed to create floor plan" });
    }
  });

  // Update a floor plan
  app.put("/api/floorplan/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid floor plan ID" });
      }
      
      const floorPlan = await storage.updateFloorPlan(id, req.body);
      if (!floorPlan) {
        return res.status(404).json({ error: "Floor plan not found" });
      }
      
      res.json(floorPlan);
    } catch (error) {
      console.error("Error updating floor plan:", error);
      res.status(500).json({ error: "Failed to update floor plan" });
    }
  });

  // Delete a floor plan
  app.delete("/api/floorplan/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid floor plan ID" });
      }
      
      const deleted = await storage.deleteFloorPlan(id);
      if (!deleted) {
        return res.status(404).json({ error: "Floor plan not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting floor plan:", error);
      res.status(500).json({ error: "Failed to delete floor plan" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
