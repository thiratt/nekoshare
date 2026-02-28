import { relations } from "drizzle-orm";
import { bigint, index, mysqlEnum, mysqlTable, text, timestamp, unique, varchar } from "drizzle-orm/mysql-core";
import { accounts, sessions, users } from "./auth";

const devices = mysqlTable(
	"devices",
	{
		id: varchar("id", { length: 36 }).primaryKey(),
		userId: varchar("user_id", { length: 36 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		currentSessionId: varchar("current_session_id", { length: 36 }).references(() => sessions.id, {
			onDelete: "set null",
		}),
		deviceName: varchar("device_name", { length: 50 }).notNull(),
		platform: mysqlEnum("platform", ["windows", "android", "web", "other"]).notNull(),
		fcmTokenLatest: varchar("fcm_token_latest", { length: 255 }),
		fingerprint: varchar("fingerprint", { length: 128 }),
		createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
		lastActiveAt: timestamp("last_seen_at", { fsp: 3 }).defaultNow().notNull(),
	},
	(table) => [
		index("devices_user_id_idx").on(table.userId),
		index("devices_current_session_id_idx").on(table.currentSessionId),
		unique("devices_user_fingerprint_unique").on(table.userId, table.fingerprint),
	],
);

const friends = mysqlTable(
	"friends",
	{
		id: varchar("id", { length: 36 }).primaryKey(),
		userLowId: varchar("user_low_id", { length: 36 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		userHighId: varchar("user_high_id", { length: 36 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		requestedByUserId: varchar("requested_by_user_id", { length: 36 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		blockedByUserId: varchar("blocked_by_user_id", { length: 36 }).references(() => users.id, {
			onDelete: "set null",
		}),
		status: mysqlEnum("status", ["pending", "accepted", "blocked"]).default("pending").notNull(),
		createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { fsp: 3 })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		unique("friends_user_pair_unique").on(table.userLowId, table.userHighId),
		index("friends_requested_by_user_id_idx").on(table.requestedByUserId),
		index("friends_blocked_by_user_id_idx").on(table.blockedByUserId),
	],
);

const userSettings = mysqlTable("user_settings", {
	userId: varchar("user_id", { length: 36 })
		.primaryKey()
		.references(() => users.id, { onDelete: "cascade" }),
	theme: mysqlEnum("theme", ["light", "dark", "system"]).default("system").notNull(),
	language: mysqlEnum("language", ["en", "th"]).default("th").notNull(),
	updatedAt: timestamp("updated_at", { fsp: 3 })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

const notifications = mysqlTable(
	"notifications",
	{
		id: varchar("id", { length: 36 }).primaryKey(),
		userId: varchar("user_id", { length: 36 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		actorUserId: varchar("actor_user_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
		type: varchar("type", { length: 100 }).notNull(),
		i18nKey: varchar("i18n_key", { length: 255 }).notNull(),
		params: text("params"),
		readAt: timestamp("read_at", { fsp: 3 }),
		createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
	},
	(table) => [
		index("notifications_user_id_idx").on(table.userId),
		index("notifications_actor_user_id_idx").on(table.actorUserId),
		index("notifications_read_at_idx").on(table.readAt),
	],
);

const publicShare = mysqlTable(
	"public_share",
	{
		id: varchar("id", { length: 36 }).primaryKey(),
		userId: varchar("user_id", { length: 36 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		title: varchar("title", { length: 50 }).notNull(),
		url: varchar("url", { length: 36 }).notNull(),
		passwordHash: text("password_hash"),
		createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
		expiresAt: timestamp("expires_at", { fsp: 3 }).notNull(),
	},
	(table) => [unique("public_share_url_unique").on(table.url), index("public_share_user_id_idx").on(table.userId)],
);

const publicShareFiles = mysqlTable(
	"public_share_files",
	{
		id: varchar("id", { length: 36 }).primaryKey(),
		publicShareId: varchar("public_share_id", { length: 36 })
			.notNull()
			.references(() => publicShare.id, { onDelete: "cascade" }),
		storageKey: text("storage_key").notNull(),
		fileName: varchar("file_name", { length: 255 }).notNull(),
		fileSize: bigint("file_size", { mode: "number" }).notNull(),
		mimeType: varchar("mime_type", { length: 50 }).notNull(),
	},
	(table) => [index("public_share_files_public_share_id_idx").on(table.publicShareId)],
);

const transferMetrics = mysqlTable(
	"transfer_metrics",
	{
		id: varchar("id", { length: 36 }).primaryKey(),
		senderId: varchar("sender_id", { length: 36 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		transferMethod: mysqlEnum("transfer_method", ["local", "relay", "flash_share"]).notNull(),
		fileSize: bigint("file_size", { mode: "number" }).notNull(),
		createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
	},
	(table) => [index("transfer_metrics_sender_id_idx").on(table.senderId)],
);

const userRelations = relations(users, ({ many, one }) => ({
	sessions: many(sessions),
	accounts: many(accounts),
	preference: one(userSettings),
	devices: many(devices),
	publicShares: many(publicShare),
	sentTransfers: many(transferMetrics),
	notifications: many(notifications, { relationName: "notificationReceiver" }),
	actedNotifications: many(notifications, { relationName: "notificationActor" }),
	friendLowLinks: many(friends, { relationName: "friendLow" }),
	friendHighLinks: many(friends, { relationName: "friendHigh" }),
	friendRequestedLinks: many(friends, { relationName: "friendRequestedBy" }),
	friendBlockedLinks: many(friends, { relationName: "friendBlockedBy" }),
}));

const userSettingsRelations = relations(userSettings, ({ one }) => ({
	user: one(users, {
		fields: [userSettings.userId],
		references: [users.id],
	}),
}));

const deviceRelations = relations(devices, ({ one }) => ({
	user: one(users, {
		fields: [devices.userId],
		references: [users.id],
	}),
	session: one(sessions, {
		fields: [devices.currentSessionId],
		references: [sessions.id],
	}),
}));

const friendRelations = relations(friends, ({ one }) => ({
	userLow: one(users, {
		fields: [friends.userLowId],
		references: [users.id],
		relationName: "friendLow",
	}),
	userHigh: one(users, {
		fields: [friends.userHighId],
		references: [users.id],
		relationName: "friendHigh",
	}),
	requestedBy: one(users, {
		fields: [friends.requestedByUserId],
		references: [users.id],
		relationName: "friendRequestedBy",
	}),
	blockedBy: one(users, {
		fields: [friends.blockedByUserId],
		references: [users.id],
		relationName: "friendBlockedBy",
	}),
}));

const publicShareRelations = relations(publicShare, ({ one, many }) => ({
	user: one(users, {
		fields: [publicShare.userId],
		references: [users.id],
	}),
	files: many(publicShareFiles),
}));

const publicShareFilesRelations = relations(publicShareFiles, ({ one }) => ({
	publicShare: one(publicShare, {
		fields: [publicShareFiles.publicShareId],
		references: [publicShare.id],
	}),
}));

const transferMetricsRelations = relations(transferMetrics, ({ one }) => ({
	sender: one(users, {
		fields: [transferMetrics.senderId],
		references: [users.id],
	}),
}));

const notificationsRelations = relations(notifications, ({ one }) => ({
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id],
		relationName: "notificationReceiver",
	}),
	actor: one(users, {
		fields: [notifications.actorUserId],
		references: [users.id],
		relationName: "notificationActor",
	}),
}));

export {
	userSettings,
	devices,
	friends,
	publicShare,
	publicShareFiles,
	transferMetrics,
	notifications,
	userRelations,
	userSettingsRelations,
	deviceRelations,
	friendRelations,
	publicShareRelations,
	publicShareFilesRelations,
	transferMetricsRelations,
	notificationsRelations,
	// Backward-compatible aliases for existing imports.
	userSettings as userPreference,
	devices as device,
	friends as friend,
	publicShare as flashShare,
	publicShareFiles as publicShareFile,
	transferMetrics as transferHistory,
	notifications as notification,
};
