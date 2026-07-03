CREATE TABLE "recurring_expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" "expense_category" NOT NULL,
	"description" varchar(255) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"paymentMethod" "payment_method" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "church_settings" ADD COLUMN "lastRecurringExpensePromptMonth" varchar(7);