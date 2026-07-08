CREATE TABLE "goal_contributions" (
	"id" serial PRIMARY KEY NOT NULL,
	"goalId" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"contributionDate" date NOT NULL,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_goalId_goals_id_fk" FOREIGN KEY ("goalId") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;