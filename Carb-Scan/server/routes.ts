import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import { z } from "zod";
import { storage } from "./storage";
import { sendPushNotification, sendNotificationMessage, processPendingNotifications } from "./notifications";

const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
const CARBSCAN_API_BASE = "https://carbscan.ai/api/mobile/v1";

interface CarbscanUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  subscriptionTier: string;
}

async function verifyAccessToken(authHeader: string | undefined): Promise<CarbscanUser | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  
  try {
    const response = await fetch(`${CARBSCAN_API_BASE}/auth/me`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    if (result.success && result.data) {
      return result.data as CarbscanUser;
    }
    return null;
  } catch (error) {
    console.error("Error verifying access token:", error);
    return null;
  }
}

function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-admin-api-key"];
  
  if (!ADMIN_API_KEY) {
    res.status(503).json({
      success: false,
      error: "Admin authentication not configured",
    });
    return;
  }

  if (apiKey !== ADMIN_API_KEY) {
    res.status(401).json({
      success: false,
      error: "Unauthorized - invalid or missing admin API key",
    });
    return;
  }
  
  next();
}

const registerDeviceSchema = z.object({
  expoPushToken: z.string().min(1),
  platform: z.enum(["ios", "android"]),
  deviceModel: z.string().optional(),
  osVersion: z.string().optional(),
  appVersion: z.string().optional(),
  userId: z.string().min(1),
});

const unregisterDeviceSchema = z.object({
  expoPushToken: z.string().min(1),
});

const createNotificationSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  data: z.record(z.any()).optional(),
  category: z.string().optional(),
  audienceType: z.enum(["all", "subscribed", "free"]).optional(),
  scheduledFor: z.string().datetime().optional(),
  createdBy: z.string().optional(),
});

const triggerNotificationSchema = z.object({
  messageId: z.string().optional(),
  title: z.string().optional(),
  body: z.string().optional(),
  data: z.record(z.any()).optional(),
  userIds: z.array(z.string()).optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/mobile/v1/devices/register", async (req, res) => {
    try {
      const data = registerDeviceSchema.parse(req.body);
      
      const user = await verifyAccessToken(req.headers.authorization);
      
      if (!user) {
        res.status(401).json({
          success: false,
          error: "Unauthorized - valid access token required",
        });
        return;
      }

      if (user.id !== data.userId) {
        res.status(403).json({
          success: false,
          error: "Forbidden - cannot register device for another user",
        });
        return;
      }
      
      const device = await storage.registerDevice({
        userId: user.id,
        expoPushToken: data.expoPushToken,
        platform: data.platform,
        deviceModel: data.deviceModel,
        osVersion: data.osVersion,
        appVersion: data.appVersion,
      });

      res.json({
        success: true,
        data: {
          registered: true,
          deviceId: device.id,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: "Invalid request data",
          details: error.errors,
        });
        return;
      }
      console.error("Device registration error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to register device",
      });
    }
  });

  app.post("/api/mobile/v1/devices/unregister", async (req, res) => {
    try {
      const data = unregisterDeviceSchema.parse(req.body);
      
      const user = await verifyAccessToken(req.headers.authorization);
      
      if (!user) {
        res.status(401).json({
          success: false,
          error: "Unauthorized - valid access token required",
        });
        return;
      }

      const existingDevice = await storage.getDeviceByToken(data.expoPushToken);
      if (existingDevice && existingDevice.userId !== user.id) {
        res.status(403).json({
          success: false,
          error: "Forbidden - cannot unregister device for another user",
        });
        return;
      }
      
      await storage.unregisterDevice(data.expoPushToken);

      res.json({
        success: true,
        data: {
          unregistered: true,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: "Invalid request data",
          details: error.errors,
        });
        return;
      }
      console.error("Device unregistration error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to unregister device",
      });
    }
  });

  app.post("/api/notifications/create", requireAdminAuth, async (req, res) => {
    try {
      const data = createNotificationSchema.parse(req.body);
      
      const message = await storage.createNotificationMessage({
        title: data.title,
        body: data.body,
        data: data.data ? JSON.stringify(data.data) : undefined,
        category: data.category,
        audienceType: data.audienceType || "all",
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
        createdBy: data.createdBy,
      });

      res.json({
        success: true,
        data: {
          messageId: message.id,
          status: message.status,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: "Invalid request data",
          details: error.errors,
        });
        return;
      }
      console.error("Create notification error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create notification",
      });
    }
  });

  app.post("/api/notifications/trigger", requireAdminAuth, async (req, res) => {
    try {
      const data = triggerNotificationSchema.parse(req.body);
      
      let result;
      
      if (data.messageId) {
        result = await sendNotificationMessage(data.messageId);
      } else if (data.title && data.body) {
        result = await sendPushNotification(
          data.title,
          data.body,
          data.data,
          data.userIds
        );
      } else {
        res.status(400).json({
          success: false,
          error: "Either messageId or title/body required",
        });
        return;
      }

      res.json({
        success: true,
        data: {
          successCount: result.successCount,
          failureCount: result.failureCount,
          errors: result.errors.length > 0 ? result.errors : undefined,
        },
      });
    } catch (error) {
      console.error("Trigger notification error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to trigger notification",
      });
    }
  });

  app.post("/api/notifications/process-pending", requireAdminAuth, async (req, res) => {
    try {
      await processPendingNotifications();
      
      res.json({
        success: true,
        data: {
          processed: true,
        },
      });
    } catch (error) {
      console.error("Process pending notifications error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process pending notifications",
      });
    }
  });

  app.get("/api/notifications/pending", requireAdminAuth, async (req, res) => {
    try {
      const pending = await storage.getPendingNotifications();
      
      res.json({
        success: true,
        data: {
          notifications: pending.map(n => ({
            id: n.id,
            title: n.title,
            body: n.body,
            category: n.category,
            audienceType: n.audienceType,
            status: n.status,
            scheduledFor: n.scheduledFor,
            createdAt: n.createdAt,
          })),
        },
      });
    } catch (error) {
      console.error("Get pending notifications error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get pending notifications",
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
