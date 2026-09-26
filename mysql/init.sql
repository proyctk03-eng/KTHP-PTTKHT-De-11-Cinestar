-- ========================================================
-- ĐỀ TÀI 11: HỆ THỐNG ĐẶT VÉ XEM PHIM & SỰ KIỆN TRỰC TUYẾN
-- MÔN: TRIỂN KHAI VÀ QUẢN TRỊ HỆ THỐNG PHẦN MỀM - K23
-- SINH VIÊN: NGUYỄN TUẤN ĐẠT - MSV: DTC245200452
-- ========================================================

CREATE DATABASE IF NOT EXISTS `ticket_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `ticket_db`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `booking_details`;
DROP TABLE IF EXISTS `bookings`;
DROP TABLE IF EXISTS `seats`;
DROP TABLE IF EXISTS `showtimes`;
DROP TABLE IF EXISTS `rooms`;
DROP TABLE IF EXISTS `movies`;
DROP TABLE IF EXISTS `categories`;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Bảng danh mục thể loại
CREATE TABLE `categories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `description` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng phim và sự kiện
CREATE TABLE `movies` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `category_id` INT NOT NULL,
    `type` ENUM('MOVIE', 'EVENT') DEFAULT 'MOVIE',
    `duration` INT NOT NULL COMMENT 'Thời lượng tính bằng phút',
    `release_date` DATE NOT NULL,
    `director` VARCHAR(150) DEFAULT 'Đang cập nhật',
    `cast` VARCHAR(255) DEFAULT 'Đang cập nhật',
    `description` TEXT NOT NULL,
    `poster_url` VARCHAR(500) NOT NULL,
    `banner_url` VARCHAR(500) NULL,
    `trailer_url` VARCHAR(500) NULL,
    `base_price` DECIMAL(10,2) NOT NULL DEFAULT 80000.00,
    `rating` VARCHAR(10) DEFAULT 'T16',
    `status` ENUM('NOW_SHOWING', 'COMING_SOON', 'SPECIAL_EVENT') DEFAULT 'NOW_SHOWING',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_movies_categories` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng phòng chiếu / hội trường sự kiện
CREATE TABLE `rooms` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `room_type` VARCHAR(50) DEFAULT '2D Digital' COMMENT '2D, 3D, IMAX Laser, Dolby Atmos, Hội trường',
    `total_rows` INT DEFAULT 6,
    `seats_per_row` INT DEFAULT 10,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bảng suất chiếu / lịch biểu diễn
CREATE TABLE `showtimes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `movie_id` INT NOT NULL,
    `room_id` INT NOT NULL,
    `show_date` DATE NOT NULL,
    `start_time` TIME NOT NULL,
    `end_time` TIME NOT NULL,
    `price_multiplier` DECIMAL(3,2) DEFAULT 1.00 COMMENT 'Hệ số giá giờ vàng hoặc cuối tuần',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_showtimes_movies` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_showtimes_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Bảng ghế ngồi cố định của từng phòng
CREATE TABLE `seats` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `room_id` INT NOT NULL,
    `seat_code` VARCHAR(10) NOT NULL COMMENT 'A01, A02 ... F10',
    `seat_row` CHAR(1) NOT NULL,
    `seat_number` INT NOT NULL,
    `seat_type` ENUM('STANDARD', 'VIP', 'COUPLE') DEFAULT 'STANDARD',
    `extra_price` DECIMAL(10,2) DEFAULT 0.00,
    CONSTRAINT `fk_seats_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY `unique_room_seat` (`room_id`, `seat_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Bảng đơn đặt vé
CREATE TABLE `bookings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `booking_code` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Mã vé TKT-DTC245200452-XXXX',
    `customer_name` VARCHAR(150) NOT NULL,
    `customer_phone` VARCHAR(20) NOT NULL,
    `customer_email` VARCHAR(150) NOT NULL,
    `showtime_id` INT NOT NULL,
    `total_seats` INT NOT NULL DEFAULT 1,
    `total_amount` DECIMAL(12,2) NOT NULL,
    `payment_method` ENUM('MOMO', 'VNPAY', 'BANKING', 'CASH') DEFAULT 'MOMO',
    `payment_status` ENUM('PENDING', 'PAID', 'CANCELLED') DEFAULT 'PAID',
    `transaction_id` VARCHAR(100) NOT NULL,
    `booking_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_bookings_showtimes` FOREIGN KEY (`showtime_id`) REFERENCES `showtimes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Bảng chi tiết vé (Ghế đã được đặt trong từng đơn vé)
CREATE TABLE `booking_details` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `booking_id` INT NOT NULL,
    `showtime_id` INT NOT NULL,
    `seat_id` INT NOT NULL,
    `seat_code` VARCHAR(10) NOT NULL,
    `price` DECIMAL(10,2) NOT NULL,
    CONSTRAINT `fk_details_bookings` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_details_showtimes` FOREIGN KEY (`showtime_id`) REFERENCES `showtimes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_details_seats` FOREIGN KEY (`seat_id`) REFERENCES `seats` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE KEY `unique_showtime_seat` (`showtime_id`, `seat_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- CHÈN DỮ LIỆU MẪU BAN ĐẦU (SEED DATA)
-- ========================================================

-- Thể loại
INSERT INTO `categories` (`id`, `name`, `description`) VALUES
(1, 'Khoa học viễn tưởng', 'Hành tinh vũ trụ, tương lai, kỹ xảo điện ảnh đỉnh cao'),
(2, 'Hành động - Bom tấn', 'Chiến đấu mãn nhãn, âm thanh sống động Dolby Atmos'),
(3, 'Tâm lý - Tình cảm', 'Câu chuyện cảm động, gia đình và cuộc sống'),
(4, 'Hoạt hình - Gia đình', 'Hoạt hình trinh thám, thiếu nhi và mọi lứa tuổi'),
(5, 'Sự kiện âm nhạc Live', 'Concert quy mô lớn, đêm nhạc idol sống động');

-- Phim và sự kiện
INSERT INTO `movies` (`id`, `title`, `category_id`, `type`, `duration`, `release_date`, `director`, `cast`, `description`, `poster_url`, `banner_url`, `trailer_url`, `base_price`, `rating`, `status`) VALUES
(1, 'Dune: Hành Tinh Cát - Phần 2', 1, 'MOVIE', 166, '2024-03-01', 'Denis Villeneuve', 'Timothée Chalamet, Zendaya, Rebecca Ferguson', 'Paul Atreides hợp lực cùng Chani và người Fremen trên sa mạc Arrakis để báo thù những kẻ đã hủy hoại gia đình mình.', 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80', 'https://www.youtube.com/watch?v=Way9Dexny3w', 95000.00, 'T16', 'NOW_SHOWING'),
(2, 'Godzilla x Kong: Đế Chế Mới', 2, 'MOVIE', 115, '2024-03-29', 'Adam Wingard', 'Rebecca Hall, Brian Tyree Henry, Dan Stevens', 'Hai gã khổng lồ cổ đại Godzilla và Kong tái xuất đối đầu trước một mối đe dọa sinh tử tiềm ẩn sâu bên trong Trái Đất Rỗng.', 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80', 'https://www.youtube.com/watch?v=lV1OOlGwExg', 90000.00, 'T13', 'NOW_SHOWING'),
(3, 'Mai - Tình Yêu & Định Kiến', 3, 'MOVIE', 131, '2024-02-10', 'Trấn Thành', 'Phương Anh Đào, Tuấn Trần, Trấn Thành, Hồng Đào', 'Mai - người phụ nữ trải qua nhiều tổn thương tìm thấy ánh sáng hy vọng khi gặp Dương, chàng trai trẻ đầy nhiệt huyết.', 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&auto=format&fit=crop&q=80', 'https://www.youtube.com/watch?v=p4v38sX2bJg', 85000.00, 'T18', 'NOW_SHOWING'),
(4, 'Conan: Ngôi Sao 5 Cánh 1 Triệu Đô', 4, 'MOVIE', 110, '2024-08-02', 'Chika Nagaoka', 'Takayama Minami, Yamaguchi Kappei, Horikawa Ryo', 'Vụ án bí ẩn xoay quanh thanh kiếm báu thời Mạc phủ và cuộc đấu trí giữa Conan, Siêu đạo chích Kid và Hattori Heiji.', 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1600&auto=format&fit=crop&q=80', 'https://www.youtube.com/watch?v=2Tz8XQc5m50', 80000.00, 'P', 'NOW_SHOWING'),
(5, 'Live Concert: Anh Trai Vượt Ngàn Chông Gai', 5, 'EVENT', 210, '2024-10-19', 'Đinh Hà Uyên Thư', '33 Anh Tài, Soobin, Bằng Kiều, Jun Phạm, Kay Trần', 'Đại nhạc hội bùng nổ cảm xúc với sân khấu ánh sáng đẳng cấp quốc tế, âm thanh vòm đỉnh cao và hơn 30 tiết mục xuất sắc.', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1600&auto=format&fit=crop&q=80', 'https://www.youtube.com/watch?v=liveconcert', 250000.00, 'P', 'SPECIAL_EVENT');

-- Phòng chiếu
INSERT INTO `rooms` (`id`, `name`, `room_type`, `total_rows`, `seats_per_row`) VALUES
(1, 'Phòng 01 - IMAX Laser 3D', 'IMAX Laser', 6, 10),
(2, 'Phòng 02 - Dolby Atmos Gold', 'Dolby Atmos', 6, 10),
(3, 'Phòng 03 - Grand Theater Hall', 'Hội trường biểu diễn', 6, 10);

-- Sinh tự động 60 ghế (Hàng A đến F, mỗi hàng 10 ghế) cho cả 3 phòng
-- Hàng A, B: Standard (cộng 0đ)
-- Hàng C, D, E: VIP (cộng 20.000đ)
-- Hàng F: Couple (cộng 45.000đ)
DELIMITER $$
CREATE PROCEDURE GenerateRoomSeats(IN r_id INT)
BEGIN
    DECLARE r CHAR(1);
    DECLARE n INT;
    DECLARE s_type VARCHAR(20);
    DECLARE ex_price DECIMAL(10,2);
    DECLARE row_idx INT;
    
    SET row_idx = 0;
    WHILE row_idx < 6 DO
        SET r = CHAR(65 + row_idx); -- 'A', 'B', 'C', 'D', 'E', 'F'
        IF r IN ('A', 'B') THEN
            SET s_type = 'STANDARD';
            SET ex_price = 0.00;
        ELSEIF r IN ('C', 'D', 'E') THEN
            SET s_type = 'VIP';
            SET ex_price = 20000.00;
        ELSE
            SET s_type = 'COUPLE';
            SET ex_price = 45000.00;
        END IF;
        
        SET n = 1;
        WHILE n <= 10 DO
            INSERT INTO `seats` (`room_id`, `seat_code`, `seat_row`, `seat_number`, `seat_type`, `extra_price`)
            VALUES (r_id, CONCAT(r, LPAD(n, 2, '0')), r, n, s_type, ex_price);
            SET n = n + 1;
        END WHILE;
        
        SET row_idx = row_idx + 1;
    END WHILE;
END$$
DELIMITER ;

CALL GenerateRoomSeats(1);
CALL GenerateRoomSeats(2);
CALL GenerateRoomSeats(3);
DROP PROCEDURE GenerateRoomSeats;

-- Suất chiếu hôm nay và những ngày tới
INSERT INTO `showtimes` (`id`, `movie_id`, `room_id`, `show_date`, `start_time`, `end_time`, `price_multiplier`) VALUES
-- Phim 1: Dune 2
(1, 1, 1, CURDATE(), '09:30:00', '12:15:00', 1.00),
(2, 1, 1, CURDATE(), '14:00:00', '16:45:00', 1.10),
(3, 1, 1, CURDATE(), '19:30:00', '22:15:00', 1.25),
(4, 1, 1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '19:30:00', '22:15:00', 1.25),

-- Phim 2: Godzilla x Kong
(5, 2, 2, CURDATE(), '10:00:00', '11:55:00', 1.00),
(6, 2, 2, CURDATE(), '15:15:00', '17:10:00', 1.10),
(7, 2, 2, CURDATE(), '20:15:00', '22:10:00', 1.25),

-- Phim 3: Mai
(8, 3, 2, CURDATE(), '12:30:00', '14:40:00', 1.00),
(9, 3, 2, CURDATE(), '17:45:00', '19:55:00', 1.20),

-- Phim 4: Conan
(10, 4, 1, CURDATE(), '17:00:00', '18:50:00', 1.00),
(11, 4, 2, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:00:00', '10:50:00', 1.00),

-- Sự kiện 5: Concert Anh Trai
(12, 5, 3, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '18:30:00', '22:00:00', 1.50);

-- Tạo một vài đơn đặt vé mẫu để có sẵn ghế đã bán (Màu đỏ/xám trên sơ đồ)
INSERT INTO `bookings` (`id`, `booking_code`, `customer_name`, `customer_phone`, `customer_email`, `showtime_id`, `total_seats`, `total_amount`, `payment_method`, `payment_status`, `transaction_id`) VALUES
(1, 'TKT-DTC24520-8891', 'Trần Văn Nam', '0987654321', 'nam.tv@gmail.com', 3, 2, 275000.00, 'MOMO', 'PAID', 'MOMO_TXN_9918237'),
(2, 'TKT-DTC24520-4420', 'Lê Thu Trang', '0912345678', 'trang.lt@gmail.com', 3, 1, 143750.00, 'VNPAY', 'PAID', 'VNPAY_TXN_7721834');

-- Đánh dấu các ghế đã bán cho suất chiếu số 3 (Dune 2 lúc 19:30 tối nay)
-- Ghế C05, C06 (Seat ID 25, 26 của phòng 1)
-- Ghế D07 (Seat ID 37 của phòng 1)
INSERT INTO `booking_details` (`booking_id`, `showtime_id`, `seat_id`, `seat_code`, `price`) VALUES
(1, 3, 25, 'C05', 137500.00),
(1, 3, 26, 'C06', 137500.00),
(2, 3, 37, 'D07', 143750.00);

