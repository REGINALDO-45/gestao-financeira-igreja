CREATE TABLE "annual_budgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"monthlyEntriesGoal" numeric(10, 2) NOT NULL,
	"monthlyExpensesGoal" numeric(10, 2) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "annual_budgets_year_unique" UNIQUE("year")
);
