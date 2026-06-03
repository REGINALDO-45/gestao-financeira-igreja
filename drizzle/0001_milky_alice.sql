CREATE TABLE `church_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchName` varchar(255) NOT NULL,
	`pastorName` varchar(255) NOT NULL,
	`treasurerName` varchar(255) NOT NULL,
	`defaultVerse` text,
	`logoUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `church_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cost_centers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cost_centers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int,
	`entryDate` date NOT NULL,
	`category` enum('dizimo','oferta','oferta_especial','campanha','missoes','construcao','bazar','almoco_beneficente','cantina','doacao','outras_receitas') NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`paymentMethod` enum('pix','dinheiro','transferencia','cartao','deposito') NOT NULL,
	`description` text,
	`cultoSunday` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`expenseDate` date NOT NULL,
	`category` enum('agua','energia','internet','aluguel','material_limpeza','evangelismo','missoes','construcao','equipamentos','manutencao','outras_despesas') NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`paymentMethod` enum('pix','dinheiro','transferencia','cartao','deposito') NOT NULL,
	`paymentStatus` enum('pendente','pago','cancelado') NOT NULL DEFAULT 'pendente',
	`description` text,
	`supplier` varchar(255),
	`costCenterId` int,
	`voucherUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(20),
	`email` varchar(320),
	`address` text,
	`birthDate` date,
	`baptismDate` date,
	`status` enum('regular','atrasado','inativo') NOT NULL DEFAULT 'regular',
	`isActiveTithePayer` boolean NOT NULL DEFAULT false,
	`observations` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entryId` int NOT NULL,
	`receiptNumber` varchar(50) NOT NULL,
	`memberId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`category` varchar(100) NOT NULL,
	`issuedDate` date NOT NULL,
	`pdfUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `receipts_receiptNumber_unique` UNIQUE(`receiptNumber`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','tesoureiro','visualizador') NOT NULL DEFAULT 'visualizador';