CREATE TYPE "public"."entry_category" AS ENUM('dizimo', 'oferta', 'oferta_especial', 'campanha', 'missoes', 'construcao', 'bazar', 'almoco_beneficente', 'cantina', 'doacao', 'outras_receitas');--> statement-breakpoint
CREATE TYPE "public"."expense_category" AS ENUM('agua', 'energia', 'internet', 'aluguel', 'material_limpeza', 'evangelismo', 'missoes', 'construcao', 'equipamentos', 'manutencao', 'outras_despesas');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('regular', 'atrasado', 'inativo');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('pix', 'dinheiro', 'transferencia', 'cartao', 'deposito');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pendente', 'pago', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'tesoureiro', 'visualizador');--> statement-breakpoint
CREATE TABLE "church_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"churchName" varchar(255) NOT NULL,
	"pastorName" varchar(255) NOT NULL,
	"treasurerName" varchar(255) NOT NULL,
	"defaultVerse" text,
	"logoUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_centers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"memberId" integer,
	"entryDate" date NOT NULL,
	"category" "entry_category" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"paymentMethod" "payment_method" NOT NULL,
	"description" text,
	"cultoSunday" varchar(50),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"expenseDate" date NOT NULL,
	"category" "expense_category" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"paymentMethod" "payment_method" NOT NULL,
	"paymentStatus" "payment_status" DEFAULT 'pendente' NOT NULL,
	"description" text,
	"supplier" varchar(255),
	"costCenterId" integer,
	"voucherUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(20),
	"email" varchar(320),
	"address" text,
	"birthDate" date,
	"baptismDate" date,
	"status" "member_status" DEFAULT 'regular' NOT NULL,
	"isActiveTithePayer" boolean DEFAULT false NOT NULL,
	"observations" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"entryId" integer NOT NULL,
	"receiptNumber" varchar(50) NOT NULL,
	"memberId" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"category" varchar(100) NOT NULL,
	"issuedDate" date NOT NULL,
	"pdfUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "receipts_receiptNumber_unique" UNIQUE("receiptNumber")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'visualizador' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
