CREATE TYPE "public"."goal_status" AS ENUM('em_andamento', 'concluida', 'cancelada');--> statement-breakpoint
CREATE TABLE "goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"targetAmount" numeric(10, 2) NOT NULL,
	"currentAmount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"deadline" date,
	"status" "goal_status" DEFAULT 'em_andamento' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
