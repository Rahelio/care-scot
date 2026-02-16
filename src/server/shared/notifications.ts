import { prisma } from "@/lib/prisma";
import type { Notification } from "@prisma/client";

export type { Notification };

export interface CreateNotificationInput {
  organisationId: string;
  userId: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  link?: string;
}

export interface NotificationService {
  send(input: CreateNotificationInput): Promise<Notification>;
  getUnread(userId: string, organisationId: string): Promise<Notification[]>;
  getAll(
    userId: string,
    organisationId: string,
    limit?: number,
  ): Promise<Notification[]>;
  markRead(notificationId: string, userId: string): Promise<void>;
  markAllRead(userId: string, organisationId: string): Promise<void>;
}

class PrismaNotificationService implements NotificationService {
  async send(input: CreateNotificationInput): Promise<Notification> {
    return prisma.notification.create({
      data: {
        organisationId: input.organisationId,
        userId: input.userId,
        title: input.title,
        message: input.message,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        link: input.link ?? null,
      },
    });
  }

  async getUnread(
    userId: string,
    organisationId: string,
  ): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: { userId, organisationId, isRead: false },
      orderBy: { createdAt: "desc" },
    });
  }

  async getAll(
    userId: string,
    organisationId: string,
    limit = 50,
  ): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: { userId, organisationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string, organisationId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, organisationId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }
}

export const notificationService: NotificationService =
  new PrismaNotificationService();
