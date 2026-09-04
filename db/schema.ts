import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const appStates = sqliteTable('app_states', {
  userId: text('user_id').primaryKey(),
  payload: text('payload').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const uploadedFiles = sqliteTable('uploaded_files', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  objectKey: text('object_key').notNull().unique(),
  contentType: text('content_type').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [index('idx_uploaded_files_user_id').on(table.userId)]);
