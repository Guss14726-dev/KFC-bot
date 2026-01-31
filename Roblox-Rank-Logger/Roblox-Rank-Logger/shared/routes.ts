import { z } from "zod";
import { insertMonitorSchema, monitors } from "./schema";

export const api = {
  monitors: {
    list: {
      method: "GET" as const,
      path: "/api/monitors",
      responses: {
        200: z.array(z.custom<typeof monitors.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/monitors",
      input: insertMonitorSchema,
      responses: {
        201: z.custom<typeof monitors.$inferSelect>(),
        400: z.object({ message: z.string() }),
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/monitors/:id",
      responses: {
        204: z.void(),
        404: z.object({ message: z.string() }),
      },
    },
    test: {
        method: "POST" as const,
        path: "/api/monitors/:id/test",
        responses: {
            200: z.object({ success: z.boolean(), message: z.string() }),
            404: z.object({ message: z.string() }),
        }
    }
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
