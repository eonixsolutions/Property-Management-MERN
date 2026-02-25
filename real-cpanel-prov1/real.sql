-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 20, 2025 at 01:19 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `property_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `documents`
--

CREATE TABLE `documents` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `property_id` int(11) DEFAULT NULL,
  `tenant_id` int(11) DEFAULT NULL,
  `document_type` enum('Lease Agreement','Invoice','Receipt','Contract','Other') NOT NULL,
  `title` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_size` int(11) DEFAULT NULL,
  `upload_date` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `maintenance_requests`
--

CREATE TABLE `maintenance_requests` (
  `id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `tenant_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `priority` enum('Low','Medium','High','Emergency') DEFAULT 'Medium',
  `status` enum('Pending','In Progress','Completed','Cancelled') DEFAULT 'Pending',
  `cost` decimal(10,2) DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `owner_cheques`
--

CREATE TABLE `owner_cheques` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `owner_payment_id` int(11) DEFAULT NULL,
  `cheque_number` varchar(50) NOT NULL,
  `bank_name` varchar(255) DEFAULT NULL,
  `cheque_amount` decimal(10,2) NOT NULL,
  `cheque_date` date NOT NULL,
  `issue_date` date DEFAULT NULL,
  `status` enum('Issued','Cleared','Bounced','Cancelled') DEFAULT 'Issued',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `owner_payments`
--

CREATE TABLE `owner_payments` (
  `id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_month` date NOT NULL,
  `paid_date` date DEFAULT NULL,
  `cheque_number` varchar(50) DEFAULT NULL,
  `payment_method` enum('Cash','Check','Cheque','Bank Transfer','Credit Card','Online','Other') DEFAULT 'Bank Transfer',
  `reference_number` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('Pending','Paid','Overdue') DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `owner_payments`
--

INSERT INTO `owner_payments` (`id`, `property_id`, `user_id`, `amount`, `payment_month`, `paid_date`, `cheque_number`, `payment_method`, `reference_number`, `notes`, `status`, `created_at`, `updated_at`) VALUES
(14, 1, 1, 5000.00, '0000-00-00', '2025-11-17', NULL, 'Cash', NULL, NULL, 'Paid', '2025-11-17 12:49:31', '2025-11-17 12:49:31'),
(15, 1, 1, 8000.00, '0000-00-00', '2025-11-17', NULL, 'Cash', NULL, NULL, 'Paid', '2025-11-17 12:49:48', '2025-11-17 12:49:48'),
(16, 1, 1, 8000.00, '0000-00-00', '2025-11-17', NULL, 'Bank Transfer', NULL, NULL, 'Paid', '2025-11-17 12:50:11', '2025-11-17 12:50:11'),
(56, 1, 1, 8000.00, '2025-11-01', NULL, NULL, 'Bank Transfer', NULL, NULL, 'Pending', '2025-11-17 17:23:26', '2025-11-17 17:23:26'),
(57, 1, 1, 8000.00, '2025-12-01', NULL, NULL, 'Bank Transfer', NULL, NULL, 'Pending', '2025-11-17 17:23:26', '2025-11-17 17:23:26'),
(58, 1, 1, 8000.00, '2026-01-01', NULL, NULL, 'Bank Transfer', NULL, NULL, 'Pending', '2025-11-17 17:23:26', '2025-11-17 17:23:26'),
(59, 1, 1, 8000.00, '2026-02-01', NULL, NULL, 'Bank Transfer', NULL, NULL, 'Pending', '2025-11-17 17:23:26', '2025-11-17 17:23:26'),
(60, 1, 1, 8000.00, '2026-03-01', NULL, NULL, 'Bank Transfer', NULL, NULL, 'Pending', '2025-11-17 17:23:26', '2025-11-17 17:23:26'),
(61, 1, 1, 8000.00, '2026-04-01', NULL, NULL, 'Bank Transfer', NULL, NULL, 'Pending', '2025-11-17 17:23:26', '2025-11-17 17:23:26'),
(62, 1, 1, 8000.00, '2026-05-01', NULL, NULL, 'Bank Transfer', NULL, NULL, 'Pending', '2025-11-17 17:23:26', '2025-11-17 17:23:26'),
(63, 1, 1, 8000.00, '2026-06-01', NULL, NULL, 'Bank Transfer', NULL, NULL, 'Pending', '2025-11-17 17:23:26', '2025-11-17 17:23:26'),
(64, 1, 1, 8000.00, '2026-07-01', NULL, NULL, 'Bank Transfer', NULL, NULL, 'Pending', '2025-11-17 17:23:26', '2025-11-17 17:23:26'),
(65, 1, 1, 8000.00, '2026-08-01', NULL, NULL, 'Bank Transfer', NULL, NULL, 'Pending', '2025-11-17 17:23:26', '2025-11-17 17:23:26'),
(66, 1, 1, 8000.00, '2026-09-01', NULL, NULL, 'Bank Transfer', NULL, NULL, 'Pending', '2025-11-17 17:23:26', '2025-11-17 17:23:26'),
(67, 1, 1, 8000.00, '2026-10-01', NULL, NULL, 'Bank Transfer', NULL, NULL, 'Pending', '2025-11-17 17:23:26', '2025-11-17 17:23:26'),
(68, 1, 1, 8000.00, '2026-11-01', NULL, NULL, 'Bank Transfer', NULL, NULL, 'Pending', '2025-11-17 17:23:26', '2025-11-17 17:23:26'),
(69, 6, 1, 6000.00, '2025-11-01', NULL, NULL, 'Bank Transfer', NULL, NULL, 'Pending', '2025-11-17 17:35:11', '2025-11-17 17:35:11'),
(70, 6, 1, 6000.00, '2025-12-01', NULL, NULL, 'Bank Transfer', NULL, NULL, 'Pending', '2025-11-17 17:35:11', '2025-11-17 17:35:11'),
(71, 6, 1, 6000.00, '2026-01-01', NULL, NULL, 'Bank Transfer', NULL, NULL, 'Pending', '2025-11-17 17:35:11', '2025-11-17 17:35:11'),
(72, 6, 1, 6000.00, '2026-02-01', NULL, NULL, 'Bank Transfer', NULL, NULL, 'Pending', '2025-11-17 17:35:11', '2025-11-17 17:35:11'),
(73, 6, 1, 6000.00, '2026-03-01', NULL, NULL, 'Bank Transfer', NULL, NULL, 'Pending', '2025-11-17 17:35:11', '2025-11-17 17:35:11'),
(74, 6, 1, 6000.00, '2026-04-01', NULL, NULL, 'Bank Transfer', NULL, NULL, 'Pending', '2025-11-17 17:35:11', '2025-11-17 17:35:11'),
(75, 6, 1, 6000.00, '2026-05-01', NULL, NULL, 'Bank Transfer', NULL, NULL, 'Pending', '2025-11-17 17:35:11', '2025-11-17 17:35:11'),
(76, 6, 1, 6000.00, '2026-06-01', NULL, NULL, 'Bank Transfer', NULL, NULL, 'Pending', '2025-11-17 17:35:11', '2025-11-17 17:35:11'),
(77, 6, 1, 6000.00, '2026-07-01', NULL, NULL, 'Bank Transfer', NULL, NULL, 'Pending', '2025-11-17 17:35:11', '2025-11-17 17:35:11'),
(78, 6, 1, 6000.00, '2026-08-01', NULL, NULL, 'Bank Transfer', NULL, NULL, 'Pending', '2025-11-17 17:35:11', '2025-11-17 17:35:11'),
(79, 6, 1, 6000.00, '2026-09-01', NULL, NULL, 'Bank Transfer', NULL, NULL, 'Pending', '2025-11-17 17:35:11', '2025-11-17 17:35:11'),
(80, 6, 1, 6000.00, '2026-10-01', NULL, NULL, 'Bank Transfer', NULL, NULL, 'Pending', '2025-11-17 17:35:11', '2025-11-17 17:35:11'),
(81, 6, 1, 6000.00, '2026-11-01', NULL, NULL, 'Bank Transfer', NULL, NULL, 'Pending', '2025-11-17 17:35:11', '2025-11-17 17:35:11');

-- --------------------------------------------------------

--
-- Table structure for table `properties`
--

CREATE TABLE `properties` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `parent_property_id` int(11) DEFAULT NULL,
  `unit_name` varchar(100) DEFAULT NULL,
  `is_unit` tinyint(1) DEFAULT 0,
  `owner_name` varchar(255) DEFAULT NULL,
  `owner_contact` varchar(255) DEFAULT NULL,
  `owner_email` varchar(255) DEFAULT NULL,
  `owner_phone` varchar(20) DEFAULT NULL,
  `monthly_rent_to_owner` decimal(10,2) DEFAULT 0.00,
  `property_name` varchar(255) NOT NULL,
  `address` varchar(500) NOT NULL,
  `city` varchar(100) NOT NULL,
  `state` varchar(100) DEFAULT NULL,
  `zip_code` varchar(20) DEFAULT NULL,
  `country` varchar(100) DEFAULT 'Qatar',
  `property_type` enum('Apartment','House','Condo','Townhouse','Commercial','Other') NOT NULL,
  `bedrooms` int(11) DEFAULT NULL,
  `bathrooms` decimal(3,1) DEFAULT NULL,
  `square_feet` int(11) DEFAULT NULL,
  `purchase_price` decimal(12,2) DEFAULT NULL,
  `current_value` decimal(12,2) DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `default_rent` decimal(10,2) DEFAULT 0.00,
  `status` enum('Vacant','Occupied','Under Maintenance') DEFAULT 'Vacant',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `properties`
--

INSERT INTO `properties` (`id`, `user_id`, `parent_property_id`, `unit_name`, `is_unit`, `owner_name`, `owner_contact`, `owner_email`, `owner_phone`, `monthly_rent_to_owner`, `property_name`, `address`, `city`, `state`, `zip_code`, `country`, `property_type`, `bedrooms`, `bathrooms`, `square_feet`, `purchase_price`, `current_value`, `purchase_date`, `default_rent`, `status`, `notes`, `created_at`, `updated_at`) VALUES
(1, 1, NULL, NULL, 0, 'Sulthan', NULL, 'sidhyk@gmail.com', NULL, 8000.00, 'Thumama Villa 21', 'Doha Qatar', 'Nuaija', 'Doha', '610', 'Qatar', 'House', 6, 6.0, NULL, NULL, NULL, NULL, NULL, 'Vacant', '', '2025-11-17 12:44:30', '2025-11-17 17:23:26'),
(2, 1, 1, '1', 1, NULL, NULL, NULL, NULL, NULL, 'Unit 1', 'Doha Qatar', 'pitipana', 'Qa', '610', 'USA', 'Apartment', 1, 1.0, NULL, NULL, NULL, NULL, 1800.00, 'Occupied', '', '2025-11-17 12:44:56', '2025-11-17 14:05:19'),
(3, 1, 1, '2', 1, NULL, NULL, NULL, NULL, NULL, 'Unit 2', 'Doha Qatar', 'pitipana', 'Qa', '610', 'USA', 'Apartment', 1, 1.0, NULL, NULL, NULL, NULL, 1800.00, 'Occupied', '', '2025-11-17 12:45:22', '2025-11-17 17:36:41'),
(5, 1, 1, '3', 1, NULL, NULL, NULL, NULL, NULL, 'unit 3', 'Doha Qatar', 'pitipana', 'Qa', '610', 'USA', 'Apartment', 2, 2.0, NULL, NULL, NULL, NULL, 2800.00, 'Vacant', '', '2025-11-17 17:17:30', '2025-11-17 17:17:30'),
(6, 1, NULL, NULL, 0, 'Thameem', 'Doha Qatar', 'sidhykdsd@gmail.com', '+97454578712', 6000.00, 'Villa Mathar', 'Doha Qatar', 'Rayyan', 'Doha', '', 'Qatar', 'House', 10, 10.0, NULL, NULL, NULL, NULL, NULL, 'Vacant', '', '2025-11-17 17:35:11', '2025-11-17 17:35:11'),
(7, 1, 6, '1', 1, NULL, NULL, NULL, NULL, NULL, 'Unit1', 'Doha Qatar', 'Rayyan', 'Doha', '', 'USA', 'House', 1, 1.0, NULL, NULL, NULL, NULL, 1800.00, 'Vacant', '', '2025-11-17 17:35:41', '2025-11-17 17:35:41');

-- --------------------------------------------------------

--
-- Table structure for table `property_images`
--

CREATE TABLE `property_images` (
  `id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `image_path` varchar(500) NOT NULL,
  `image_name` varchar(255) NOT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `display_order` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `property_images`
--

INSERT INTO `property_images` (`id`, `property_id`, `image_path`, `image_name`, `is_primary`, `display_order`, `created_at`, `updated_at`) VALUES
(1, 1, 'uploads/properties/prop_1_691b247e6e8e67.15156906.png', '7.png', 1, 1, '2025-11-17 13:34:54', '2025-11-17 13:34:54'),
(2, 1, 'uploads/properties/prop_1_691b247e7bb0c7.46227018.png', '6.png', 0, 2, '2025-11-17 13:34:54', '2025-11-17 13:34:54'),
(3, 1, 'uploads/properties/prop_1_691b247e87dc23.24281010.png', '5.png', 0, 3, '2025-11-17 13:34:54', '2025-11-17 13:34:54');

-- --------------------------------------------------------

--
-- Table structure for table `rent_payments`
--

CREATE TABLE `rent_payments` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `due_date` date NOT NULL,
  `paid_date` date DEFAULT NULL,
  `cheque_number` varchar(50) DEFAULT NULL,
  `payment_method` enum('Cash','Check','Cheque','Bank Transfer','Credit Card','Online','Other') DEFAULT 'Cash',
  `status` enum('Pending','Paid','Overdue','Partial') DEFAULT 'Pending',
  `reference_number` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `rent_payments`
--

INSERT INTO `rent_payments` (`id`, `tenant_id`, `property_id`, `amount`, `due_date`, `paid_date`, `cheque_number`, `payment_method`, `status`, `reference_number`, `notes`, `created_at`, `updated_at`) VALUES
(1, 2, 3, 1800.00, '2025-11-01', NULL, NULL, 'Cash', 'Pending', NULL, NULL, '2025-11-17 17:36:41', '2025-11-17 17:36:41'),
(2, 2, 3, 1800.00, '2025-12-01', NULL, NULL, 'Cash', 'Pending', NULL, NULL, '2025-11-17 17:36:41', '2025-11-17 17:36:41'),
(3, 2, 3, 1800.00, '2026-01-01', NULL, NULL, 'Cash', 'Pending', NULL, NULL, '2025-11-17 17:36:41', '2025-11-17 17:36:41'),
(4, 2, 3, 1800.00, '2026-02-01', NULL, NULL, 'Cash', 'Pending', NULL, NULL, '2025-11-17 17:36:41', '2025-11-17 17:36:41'),
(5, 2, 3, 1800.00, '2026-03-01', NULL, NULL, 'Cash', 'Pending', NULL, NULL, '2025-11-17 17:36:41', '2025-11-17 17:36:41'),
(6, 2, 3, 1800.00, '2026-04-01', NULL, NULL, 'Cash', 'Pending', NULL, NULL, '2025-11-17 17:36:41', '2025-11-17 17:36:41'),
(7, 2, 3, 1800.00, '2026-05-01', NULL, NULL, 'Cash', 'Pending', NULL, NULL, '2025-11-17 17:36:41', '2025-11-17 17:36:41'),
(8, 2, 3, 1800.00, '2026-06-01', NULL, NULL, 'Cash', 'Pending', NULL, NULL, '2025-11-17 17:36:41', '2025-11-17 17:36:41'),
(9, 2, 3, 1800.00, '2026-07-01', NULL, NULL, 'Cash', 'Pending', NULL, NULL, '2025-11-17 17:36:41', '2025-11-17 17:36:41'),
(10, 2, 3, 1800.00, '2026-08-01', NULL, NULL, 'Cash', 'Pending', NULL, NULL, '2025-11-17 17:36:41', '2025-11-17 17:36:41'),
(11, 2, 3, 1800.00, '2026-09-01', NULL, NULL, 'Cash', 'Pending', NULL, NULL, '2025-11-17 17:36:41', '2025-11-17 17:36:41'),
(12, 2, 3, 1800.00, '2026-10-01', NULL, NULL, 'Cash', 'Pending', NULL, NULL, '2025-11-17 17:36:41', '2025-11-17 17:36:41'),
(13, 2, 3, 1800.00, '2026-11-01', NULL, NULL, 'Cash', 'Pending', NULL, NULL, '2025-11-17 17:36:41', '2025-11-17 17:36:41');

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `currency` varchar(10) DEFAULT 'QAR',
  `date_format` varchar(20) DEFAULT 'Y-m-d',
  `timezone` varchar(50) DEFAULT 'UTC',
  `notification_email` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tenants`
--

CREATE TABLE `tenants` (
  `id` int(11) NOT NULL,
  `property_id` int(11) DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `alternate_phone` varchar(20) DEFAULT NULL,
  `qatar_id` varchar(20) DEFAULT NULL,
  `move_in_date` date DEFAULT NULL,
  `move_out_date` date DEFAULT NULL,
  `lease_start` date DEFAULT NULL,
  `lease_end` date DEFAULT NULL,
  `monthly_rent` decimal(10,2) NOT NULL,
  `security_deposit` decimal(10,2) DEFAULT NULL,
  `status` enum('Active','Past','Pending') DEFAULT 'Active',
  `emergency_contact_name` varchar(100) DEFAULT NULL,
  `emergency_contact_phone` varchar(20) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tenants`
--

INSERT INTO `tenants` (`id`, `property_id`, `first_name`, `last_name`, `email`, `phone`, `alternate_phone`, `qatar_id`, `move_in_date`, `move_out_date`, `lease_start`, `lease_end`, `monthly_rent`, `security_deposit`, `status`, `emergency_contact_name`, `emergency_contact_phone`, `notes`, `created_at`, `updated_at`) VALUES
(1, 2, 'Sidheeque', 'Kunnath', 'sidhyk@gmail.com', '54578712', '54578712', '28835604643', NULL, NULL, NULL, NULL, 1800.00, NULL, 'Active', '', '', '', '2025-11-17 14:05:19', '2025-11-17 14:05:19'),
(2, 3, 'National', '(Homagama)', 'sidhykdsd@gmail.com', '', '', '', '2025-10-01', NULL, '2025-11-01', '2026-11-01', 1800.00, NULL, 'Active', '', '', '', '2025-11-17 17:36:41', '2025-11-17 17:36:41');

-- --------------------------------------------------------

--
-- Table structure for table `tenant_cheques`
--

CREATE TABLE `tenant_cheques` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `rent_payment_id` int(11) DEFAULT NULL,
  `cheque_number` varchar(50) NOT NULL,
  `bank_name` varchar(255) DEFAULT NULL,
  `cheque_amount` decimal(10,2) NOT NULL,
  `cheque_date` date NOT NULL,
  `deposit_date` date DEFAULT NULL,
  `status` enum('Pending','Deposited','Bounced','Cleared') DEFAULT 'Pending',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `property_id` int(11) DEFAULT NULL,
  `tenant_id` int(11) DEFAULT NULL,
  `type` enum('Income','Expense') NOT NULL,
  `category` varchar(100) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` text DEFAULT NULL,
  `transaction_date` date NOT NULL,
  `payment_method` enum('Cash','Check','Cheque','Bank Transfer','Credit Card','Online','Other') DEFAULT 'Bank Transfer',
  `reference_number` varchar(100) DEFAULT NULL,
  `is_recurring` tinyint(1) DEFAULT 0,
  `recurring_frequency` enum('Monthly','Weekly','Yearly') DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `transactions`
--

INSERT INTO `transactions` (`id`, `user_id`, `property_id`, `tenant_id`, `type`, `category`, `amount`, `description`, `transaction_date`, `payment_method`, `reference_number`, `is_recurring`, `recurring_frequency`, `created_at`, `updated_at`) VALUES
(1, 1, 2, NULL, 'Expense', 'Repairs', 600.00, '', '2025-11-17', 'Cash', '', 0, NULL, '2025-11-17 12:48:09', '2025-11-17 12:48:09');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `role` enum('Super Admin','Admin','Manager','User','Viewer') DEFAULT 'User',
  `status` enum('Active','Inactive','Suspended') DEFAULT 'Active',
  `last_login` timestamp NULL DEFAULT NULL,
  `email_verified` tinyint(1) DEFAULT 0,
  `phone` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password`, `first_name`, `last_name`, `role`, `status`, `last_login`, `email_verified`, `phone`, `created_at`, `updated_at`) VALUES
(1, 'sidhykqatar@gmail.com', '$2y$10$Ke3qKv3pA7gFQf5IzxUMJua/pTmCwYTQS0IhC.hYGvt5lrOZbCLje', 'Admin', 'User', 'Super Admin', 'Active', NULL, 1, NULL, '2025-11-17 12:42:33', '2025-11-17 12:42:33');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `property_id` (`property_id`),
  ADD KEY `tenant_id` (`tenant_id`);

--
-- Indexes for table `maintenance_requests`
--
ALTER TABLE `maintenance_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `property_id` (`property_id`),
  ADD KEY `tenant_id` (`tenant_id`);

--
-- Indexes for table `owner_cheques`
--
ALTER TABLE `owner_cheques`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `property_id` (`property_id`),
  ADD KEY `owner_payment_id` (`owner_payment_id`),
  ADD KEY `idx_owner_cheques_date` (`cheque_date`),
  ADD KEY `idx_owner_cheques_status` (`status`);

--
-- Indexes for table `owner_payments`
--
ALTER TABLE `owner_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `property_id` (`property_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_owner_payments_month` (`payment_month`),
  ADD KEY `idx_owner_payments_status` (`status`);

--
-- Indexes for table `properties`
--
ALTER TABLE `properties`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_properties_user` (`user_id`),
  ADD KEY `idx_properties_parent` (`parent_property_id`),
  ADD KEY `idx_properties_status` (`status`);

--
-- Indexes for table `property_images`
--
ALTER TABLE `property_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_property_images_property` (`property_id`),
  ADD KEY `idx_property_images_primary` (`is_primary`),
  ADD KEY `idx_property_images_order` (`display_order`);

--
-- Indexes for table `rent_payments`
--
ALTER TABLE `rent_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tenant_id` (`tenant_id`),
  ADD KEY `property_id` (`property_id`),
  ADD KEY `idx_rent_payments_status` (`status`),
  ADD KEY `idx_rent_payments_due_date` (`due_date`),
  ADD KEY `idx_rent_payments_paid_date` (`paid_date`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_settings_user` (`user_id`);

--
-- Indexes for table `tenants`
--
ALTER TABLE `tenants`
  ADD PRIMARY KEY (`id`),
  ADD KEY `property_id` (`property_id`),
  ADD KEY `idx_tenants_status` (`status`);

--
-- Indexes for table `tenant_cheques`
--
ALTER TABLE `tenant_cheques`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `tenant_id` (`tenant_id`),
  ADD KEY `property_id` (`property_id`),
  ADD KEY `rent_payment_id` (`rent_payment_id`),
  ADD KEY `idx_tenant_cheques_deposit` (`deposit_date`),
  ADD KEY `idx_tenant_cheques_status` (`status`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `property_id` (`property_id`),
  ADD KEY `tenant_id` (`tenant_id`),
  ADD KEY `idx_transactions_user_date` (`user_id`,`transaction_date`),
  ADD KEY `idx_transactions_type` (`type`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_users_email` (`email`),
  ADD KEY `idx_users_status` (`status`),
  ADD KEY `idx_users_role` (`role`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `documents`
--
ALTER TABLE `documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `maintenance_requests`
--
ALTER TABLE `maintenance_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `owner_cheques`
--
ALTER TABLE `owner_cheques`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `owner_payments`
--
ALTER TABLE `owner_payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=82;

--
-- AUTO_INCREMENT for table `properties`
--
ALTER TABLE `properties`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `property_images`
--
ALTER TABLE `property_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `rent_payments`
--
ALTER TABLE `rent_payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tenants`
--
ALTER TABLE `tenants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tenant_cheques`
--
ALTER TABLE `tenant_cheques`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `documents`
--
ALTER TABLE `documents`
  ADD CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `documents_ibfk_2` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `documents_ibfk_3` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `maintenance_requests`
--
ALTER TABLE `maintenance_requests`
  ADD CONSTRAINT `maintenance_requests_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `maintenance_requests_ibfk_2` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `owner_cheques`
--
ALTER TABLE `owner_cheques`
  ADD CONSTRAINT `owner_cheques_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `owner_cheques_ibfk_2` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `owner_cheques_ibfk_3` FOREIGN KEY (`owner_payment_id`) REFERENCES `owner_payments` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `owner_payments`
--
ALTER TABLE `owner_payments`
  ADD CONSTRAINT `owner_payments_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `owner_payments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `properties`
--
ALTER TABLE `properties`
  ADD CONSTRAINT `properties_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `properties_ibfk_2` FOREIGN KEY (`parent_property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `property_images`
--
ALTER TABLE `property_images`
  ADD CONSTRAINT `property_images_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `rent_payments`
--
ALTER TABLE `rent_payments`
  ADD CONSTRAINT `rent_payments_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `rent_payments_ibfk_2` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `settings`
--
ALTER TABLE `settings`
  ADD CONSTRAINT `settings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tenants`
--
ALTER TABLE `tenants`
  ADD CONSTRAINT `tenants_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `tenant_cheques`
--
ALTER TABLE `tenant_cheques`
  ADD CONSTRAINT `tenant_cheques_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tenant_cheques_ibfk_2` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tenant_cheques_ibfk_3` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tenant_cheques_ibfk_4` FOREIGN KEY (`rent_payment_id`) REFERENCES `rent_payments` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `transactions_ibfk_2` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `transactions_ibfk_3` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
