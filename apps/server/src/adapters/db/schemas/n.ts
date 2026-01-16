import { relations } from "drizzle-orm";
import { mysqlTable, varchar, text, timestamp, boolean, mysqlEnum, bigint, unique } from "drizzle-orm/mysql-core";
import { account, session, user } from "./auth";

// --- CUSTOM TABLES ---
const userPreference = mysqlTable("user_preference", {
	userId: varchar("user_id", { length: 36 })
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	theme: mysqlEnum("theme", ["light", "dark", "system"]).default("system").notNull(),
	language: mysqlEnum("language", ["en", "th"]).default("th").notNull(),
	updatedAt: timestamp("updated_at").onUpdateNow(),
});

const device = mysqlTable(
	"device",
	{
		id: varchar("id", { length: 36 }).primaryKey(),
		sessionId: varchar("session_id", { length: 36 }).references(() => session.id, { onDelete: "set null" }),
		userId: varchar("user_id", { length: 36 })
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		deviceIdentifier: varchar("device_identifier", { length: 255 }).notNull(),
		name: varchar("name", { length: 255 }).notNull(),
		os: mysqlEnum("os", ["android", "windows", "web", "other"]).notNull(),
		os_version: varchar("os_version", { length: 100 }).notNull(),
		os_long_version: varchar("os_long_version", { length: 255 }).notNull(),
		is_tailscale: boolean("is_tailscale").default(false).notNull(),
		batterySupported: boolean("battery_supported").default(false).notNull(),
		batteryCharging: boolean("battery_charging").default(false).notNull(),
		batteryPercent: bigint("battery_percent", { mode: "number" }).default(100).notNull(),
		ipv4: text("ipv4").notNull(),
		ipv6: text("ipv6"),
		lastActiveAt: timestamp("last_active_at").defaultNow().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [unique("device_user_deviceIdentifier_unique").on(table.userId, table.deviceIdentifier)]
);

const friend = mysqlTable(
	"friend",
	{
		id: varchar("id", { length: 36 }).primaryKey(),
		requesterId: varchar("requester_id", { length: 36 })
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		receiverId: varchar("receiver_id", { length: 36 })
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		status: mysqlEnum("status", ["pending", "accepted", "blocked"]).default("pending").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").onUpdateNow(),
	},
	(table) => [unique("friendship_unique_pair").on(table.requesterId, table.receiverId)]
);

const flashShare = mysqlTable("flash_share", {
	id: varchar("id", { length: 36 }).primaryKey(),
	uploaderId: varchar("uploader_id", { length: 36 })
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	fileSize: bigint("file_size", { mode: "number" }).notNull(),
	mimeType: varchar("mime_type", { length: 100 }),
	storageKey: text("storage_key").notNull(),
	downloadCount: bigint("download_count", { mode: "number" }).default(0),
	maxDownloads: bigint("max_downloads", { mode: "number" }),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

const transferHistory = mysqlTable("transfer_history", {
	id: varchar("id", { length: 36 }).primaryKey(),
	senderId: varchar("sender_id", { length: 36 })
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	receiverId: varchar("receiver_id", { length: 36 }),
	senderDeviceId: varchar("sender_device_id", { length: 36 }),
	receiverDeviceId: varchar("receiver_device_id", { length: 36 }),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	fileSize: bigint("file_size", { mode: "number" }).notNull(),
	transferMethod: mysqlEnum("transfer_method", ["local", "relay", "flash_share"]).notNull(),
	status: mysqlEnum("status", ["completed", "failed", "cancelled", "expired"]).notNull(),

	createdAt: timestamp("created_at").defaultNow().notNull(),
});

const notification = mysqlTable("notification", {
	id: varchar("id", { length: 36 }).primaryKey(),
	userId: varchar("user_id", { length: 36 })
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	type: mysqlEnum("type", ["security_alert", "friend_request", "incoming_share", "system"]).notNull(),
	title: varchar("title", { length: 255 }).notNull(),
	message: text("message"),
	isRead: boolean("is_read").default(false).notNull(),
	relatedId: varchar("related_id", { length: 36 }),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- RELATIONS DEFINITIONS ---
const userRelations = relations(user, ({ many, one }) => ({
	sessions: many(session),
	accounts: many(account),
	devices: many(device),
	preference: one(userPreference),
	sentTransfers: many(transferHistory, { relationName: "sender" }),
	receivedTransfers: many(transferHistory, { relationName: "receiver" }),
	notifications: many(notification),
	flashShares: many(flashShare),
}));

const deviceRelations = relations(device, ({ one }) => ({
	session: one(session, {
		fields: [device.sessionId],
		references: [session.id],
	}),
}));

const userPreferenceRelations = relations(userPreference, ({ one }) => ({
	user: one(user, {
		fields: [userPreference.userId],
		references: [user.id],
	}),
}));

const flashShareRelations = relations(flashShare, ({ one }) => ({
	uploader: one(user, {
		fields: [flashShare.uploaderId],
		references: [user.id],
	}),
}));

const transferHistoryRelations = relations(transferHistory, ({ one }) => ({
	sender: one(user, {
		fields: [transferHistory.senderId],
		references: [user.id],
		relationName: "sender",
	}),
	receiver: one(user, {
		fields: [transferHistory.receiverId],
		references: [user.id],
		relationName: "receiver",
	}),
}));

const notificationRelations = relations(notification, ({ one }) => ({
	user: one(user, {
		fields: [notification.userId],
		references: [user.id],
	}),
}));

export {
	userPreference,
	device,
	friend,
	flashShare,
	transferHistory,
	notification,
	userRelations,
	deviceRelations,
	userPreferenceRelations,
	flashShareRelations,
	transferHistoryRelations,
	notificationRelations,
};
