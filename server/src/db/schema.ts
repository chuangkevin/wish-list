import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  nickname: text('nickname').notNull().unique(),
  token: text('token').notNull().unique(),
  createdAt: text('created_at').notNull().default("(datetime('now'))"),
});

export const issues = sqliteTable('issues', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').default(''),
  status: text('status').notNull().default('open'),
  priority: text('priority').notNull().default('medium'),
  authorId: text('author_id').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default("(datetime('now'))"),
  updatedAt: text('updated_at').notNull().default("(datetime('now'))"),
});

export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  issueId: text('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  authorId: text('author_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull().default("(datetime('now'))"),
});

export const media = sqliteTable('media', {
  id: text('id').primaryKey(),
  issueId: text('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  commentId: text('comment_id').references(() => comments.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  mimetype: text('mimetype').notNull(),
  size: integer('size').notNull(),
  path: text('path').notNull(),
  createdAt: text('created_at').notNull().default("(datetime('now'))"),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull().default("(datetime('now'))"),
});

export const apiKeyUsage = sqliteTable('api_key_usage', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  apiKeySuffix: text('api_key_suffix').notNull(),
  model: text('model').notNull(),
  callType: text('call_type').notNull(),
  promptTokens: integer('prompt_tokens').default(0),
  completionTokens: integer('completion_tokens').default(0),
  totalTokens: integer('total_tokens').default(0),
  createdAt: text('created_at').notNull().default("(datetime('now'))"),
});
