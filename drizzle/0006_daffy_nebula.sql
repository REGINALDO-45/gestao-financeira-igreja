CREATE TYPE "public"."budget_line_type" AS ENUM('entrada', 'despesa');--> statement-breakpoint
CREATE TABLE "budget_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"type" "budget_line_type" NOT NULL,
	"category" varchar(50) NOT NULL,
	"amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "budget_lines" ("year", "month", "type", "category", "amount")
SELECT ab.year, m.month, 'entrada', 'outras_receitas', ab."monthlyEntriesGoal"
FROM "annual_budgets" ab
CROSS JOIN generate_series(1, 12) AS m(month);
--> statement-breakpoint
INSERT INTO "budget_lines" ("year", "month", "type", "category", "amount")
SELECT ab.year, m.month, 'despesa', 'outras_despesas', ab."monthlyExpensesGoal"
FROM "annual_budgets" ab
CROSS JOIN generate_series(1, 12) AS m(month);
--> statement-breakpoint
DROP TABLE "annual_budgets" CASCADE;--> statement-breakpoint
CREATE UNIQUE INDEX "budget_lines_year_month_type_category_unique" ON "budget_lines" USING btree ("year","month","type","category");