import { sql } from 'drizzle-orm'
import {
  boolean,
  date,
  index,
  inet,
  jsonb,
  numeric,
  pgEnum,
  pgSchema,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

// ─── auth.users (gestionado por Supabase, declarado para FK) ──────────────────

const authSchema = pgSchema('auth')

export const authUsers = authSchema.table('users', {
  id: uuid('id').primaryKey(),
})

// ─── Enums ────────────────────────────────────────────────────────────────────

export const spaceTypeEnum = pgEnum('space_type', ['personal', 'household', 'demo'])
export const spaceRoleEnum = pgEnum('space_role', ['owner', 'member'])
export const txTypeEnum = pgEnum('tx_type', ['income', 'expense'])
export const recurringFreqEnum = pgEnum('recurring_freq', [
  'weekly',
  'monthly',
  'quarterly',
  'annual',
])

// ─── Spaces ───────────────────────────────────────────────────────────────────

export const spaces = pgTable('spaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: spaceTypeEnum('type').notNull(),
  name: text('name').notNull(),
  createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const spaceMembers = pgTable(
  'space_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    role: spaceRoleEnum('role').notNull().default('member'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqueMember: unique('space_members_space_user_unique').on(t.spaceId, t.userId),
    spaceIdx: index('space_members_space_idx').on(t.spaceId),
    userIdx: index('space_members_user_idx').on(t.userId),
  })
)

export const spaceInvitations = pgTable(
  'space_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: spaceRoleEnum('role').notNull().default('member'),
    token: text('token').notNull().unique(),
    invitedBy: uuid('invited_by').references(() => authUsers.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    spaceIdx: index('space_invitations_space_idx').on(t.spaceId),
    emailIdx: index('space_invitations_email_idx').on(t.email),
  })
)

// ─── Superadmin + audit log ───────────────────────────────────────────────────

export const superadmins = pgTable('superadmins', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  grantedBy: uuid('granted_by').references(() => authUsers.id, { onDelete: 'set null' }),
  notes: text('notes'),
})

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorUserId: uuid('actor_user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    targetType: text('target_type'),
    targetId: uuid('target_id'),
    spaceId: uuid('space_id').references(() => spaces.id, { onDelete: 'set null' }),
    ip: inet('ip'),
    userAgent: text('user_agent'),
    payload: jsonb('payload').notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    actorIdx: index('audit_log_actor_idx').on(t.actorUserId),
    createdIdx: index('audit_log_created_idx').on(t.createdAt),
    actionIdx: index('audit_log_action_idx').on(t.action),
  })
)

// ─── Categorías ───────────────────────────────────────────────────────────────

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: txTypeEnum('type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqueName: unique('categories_space_name_type_unique').on(t.spaceId, t.name, t.type),
    spaceIdx: index('categories_space_idx').on(t.spaceId),
  })
)

// ─── Apartados de ahorro ──────────────────────────────────────────────────────

export const savingsAccounts = pgTable(
  'savings_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color'),
    targetAmount: numeric('target_amount', { precision: 15, scale: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqueName: unique('savings_accounts_space_name_unique').on(t.spaceId, t.name),
    spaceIdx: index('savings_accounts_space_idx').on(t.spaceId),
  })
)

// ─── Deudas ───────────────────────────────────────────────────────────────────

export const debts = pgTable(
  'debts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    creditor: text('creditor'),
    color: text('color'),
    initialAmount: numeric('initial_amount', { precision: 15, scale: 2 }).notNull(),
    monthlyAmount: numeric('monthly_amount', { precision: 15, scale: 2 }).notNull(),
    startDate: date('start_date').notNull(),
    recurringId: uuid('recurring_id'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    spaceIdx: index('debts_space_idx').on(t.spaceId),
    activeIdx: index('debts_active_idx').on(t.archivedAt),
  })
)

// ─── Templates recurrentes ────────────────────────────────────────────────────

export const recurringTemplates = pgTable(
  'recurring_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
    type: txTypeEnum('type').notNull(),
    description: text('description').notNull(),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    frequency: recurringFreqEnum('frequency').notNull(),
    nextDate: date('next_date').notNull(),
    active: boolean('active').notNull().default(true),
    debtId: uuid('debt_id').references(() => debts.id, { onDelete: 'set null' }),
    savingsAccountId: uuid('savings_account_id').references(() => savingsAccounts.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    spaceIdx: index('recurring_templates_space_idx').on(t.spaceId),
    activeIdx: index('recurring_templates_active_idx').on(t.active),
    debtIdx: index('recurring_templates_debt_idx').on(t.debtId),
  })
)

// ─── Transacciones ────────────────────────────────────────────────────────────

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
    type: txTypeEnum('type').notNull(),
    description: text('description').notNull().default(''),
    note: text('note').notNull().default(''),
    date: date('date').notNull(),
    category: text('category').notNull().default('Otros'),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    savingsAccountId: uuid('savings_account_id').references(() => savingsAccounts.id, {
      onDelete: 'set null',
    }),
    debtId: uuid('debt_id').references(() => debts.id, { onDelete: 'set null' }),
    attachmentPath: text('attachment_path'),
    createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    spaceIdx: index('transactions_space_idx').on(t.spaceId),
    dateIdx: index('transactions_date_idx').on(t.date),
    typeIdx: index('transactions_type_idx').on(t.type),
    categoryIdx: index('transactions_category_idx').on(t.categoryId),
    savingsIdx: index('transactions_savings_idx').on(t.savingsAccountId),
    debtIdx: index('transactions_debt_idx').on(t.debtId),
  })
)

// ─── Types inferidos ──────────────────────────────────────────────────────────

export type Space = typeof spaces.$inferSelect
export type NewSpace = typeof spaces.$inferInsert
export type SpaceMember = typeof spaceMembers.$inferSelect
export type NewSpaceMember = typeof spaceMembers.$inferInsert
export type SpaceInvitation = typeof spaceInvitations.$inferSelect
export type NewSpaceInvitation = typeof spaceInvitations.$inferInsert
export type Superadmin = typeof superadmins.$inferSelect
export type NewSuperadmin = typeof superadmins.$inferInsert
export type AuditLogEntry = typeof auditLog.$inferSelect
export type NewAuditLogEntry = typeof auditLog.$inferInsert
export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type Transaction = typeof transactions.$inferSelect
export type NewTransaction = typeof transactions.$inferInsert
export type SavingsAccount = typeof savingsAccounts.$inferSelect
export type NewSavingsAccount = typeof savingsAccounts.$inferInsert
export type Debt = typeof debts.$inferSelect
export type NewDebt = typeof debts.$inferInsert
export type RecurringTemplate = typeof recurringTemplates.$inferSelect
export type NewRecurringTemplate = typeof recurringTemplates.$inferInsert
