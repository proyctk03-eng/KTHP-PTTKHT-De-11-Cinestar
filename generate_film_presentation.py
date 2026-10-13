# -*- coding: utf-8 -*-
"""
TỰ ĐỘNG KHỞI TẠO BỘ SLIDE BÁO CÁO BẢO VỆ KẾT THÚC HỌC PHẦN CHUẨN ICTU
Đề tài 11: Hệ thống Đặt vé Xem phim & Sự kiện trực tuyến (Cinestar K23)
Sinh viên: Nguyễn Tuấn Đạt | MSV: DTC245200452 | Lớp: K23C
"""

import sys
import collections
import collections.abc
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)   # 16:9 Widescreen
    prs.slide_height = Inches(7.5)

    blank_layout = prs.slide_layouts[6]

    # Bảng màu Doanh nghiệp / Rạp chiếu hiện đại
    BG_DARK = RGBColor(15, 23, 42)        # Slate 900 (Deep Navy Dark)
    CARD_BG = RGBColor(30, 41, 59)        # Slate 800
    CARD_BORDER = RGBColor(51, 65, 85)    # Slate 700
    PRIMARY = RGBColor(56, 189, 248)      # Sky Blue 400
    ACCENT_GOLD = RGBColor(251, 191, 36)  # Amber 400
    TEXT_MAIN = RGBColor(248, 250, 252)   # Slate 50
    TEXT_MUTED = RGBColor(148, 163, 184)  # Slate 400
    SUCCESS = RGBColor(74, 222, 128)      # Emerald 400
    WHITE = RGBColor(255, 255, 255)

    def add_header(slide, title_text, category_text="HỌC PHẦN: TRIỂN KHAI VÀ QUẢN TRỊ HỆ THỐNG PHẦN MỀM"):
        # Top accent bar
        bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(0.1))
        bar.fill.solid()
        bar.fill.fore_color.rgb = PRIMARY
        bar.line.fill.background()

        # Category tag
        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11), Inches(0.4))
        tf_cat = cat_box.text_frame
        tf_cat.word_wrap = True
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = category_text.upper()
        p_cat.font.size = Pt(11)
        p_cat.font.bold = True
        p_cat.font.color.rgb = PRIMARY

        # Slide Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.75), Inches(11.5), Inches(0.8))
        tf = title_box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title_text
        p.font.size = Pt(26)
        p.font.bold = True
        p.font.color.rgb = TEXT_MAIN

    def set_slide_dark_bg(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_DARK
        bg.line.fill.background()
        return bg

    def add_card(slide, left, top, width, height, title, items, badge_text=None, border_color=CARD_BORDER):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_BG
        card.line.color.rgb = border_color
        card.line.width = Pt(1.5)

        tb = slide.shapes.add_textbox(Inches(left + 0.25), Inches(top + 0.2), Inches(width - 0.5), Inches(height - 0.4))
        tf = tb.text_frame
        tf.word_wrap = True

        p_title = tf.paragraphs[0]
        p_title.text = title
        p_title.font.size = Pt(17)
        p_title.font.bold = True
        p_title.font.color.rgb = ACCENT_GOLD if badge_text else PRIMARY
        p_title.space_after = Pt(10)

        for it in items:
            p = tf.add_paragraph()
            p.text = f"•  {it}"
            p.font.size = Pt(13)
            p.font.color.rgb = TEXT_MAIN
            p.space_after = Pt(6)

    # -------------------------------------------------------------------------
    # SLIDE 1: TRANG TIÊU ĐỀ (COVER SLIDE)
    # -------------------------------------------------------------------------
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_dark_bg(s1)

    top_stripe = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(0.2))
    top_stripe.fill.solid()
    top_stripe.fill.fore_color.rgb = ACCENT_GOLD
    top_stripe.line.fill.background()

    # University
    u_box = s1.shapes.add_textbox(Inches(1.0), Inches(0.8), Inches(11.3), Inches(0.8))
    u_tf = u_box.text_frame
    u_p = u_tf.paragraphs[0]
    u_p.text = "ĐẠI HỌC THÁI NGUYÊN — TRƯỜNG ĐẠI HỌC CNTT & TRUYỀN THÔNG (ICTU)"
    u_p.font.size = Pt(14)
    u_p.font.bold = True
    u_p.font.color.rgb = TEXT_MUTED

    # Title
    t_box = s1.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(11.3), Inches(2.2))
    t_tf = t_box.text_frame
    t_tf.word_wrap = True
    tp1 = t_tf.paragraphs[0]
    tp1.text = "BÁO CÁO KẾT THÚC HỌC PHẦN"
    tp1.font.size = Pt(20)
    tp1.font.bold = True
    tp1.font.color.rgb = PRIMARY
    tp1.space_after = Pt(8)

    tp2 = t_tf.add_paragraph()
    tp2.text = "ĐỀ TÀI 11: HỆ THỐNG ĐẶT VÉ XEM PHIM & SỰ KIỆN TRỰC TUYẾN"
    tp2.font.size = Pt(30)
    tp2.font.bold = True
    tp2.font.color.rgb = TEXT_MAIN
    tp2.space_after = Pt(6)

    tp3 = t_tf.add_paragraph()
    tp3.text = "Kiến trúc Fullstack Động • Nginx Reverse Proxy • CSDL MySQL 3NF • Cụm Giám Sát Prometheus - Grafana - Loki"
    tp3.font.size = Pt(14)
    tp3.font.color.rgb = ACCENT_GOLD

    # Student metadata card
    m_card = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), Inches(4.5), Inches(11.33), Inches(2.0))
    m_card.fill.solid()
    m_card.fill.fore_color.rgb = CARD_BG
    m_card.line.color.rgb = PRIMARY
    m_card.line.width = Pt(1.5)

    m_tb = s1.shapes.add_textbox(Inches(1.3), Inches(4.7), Inches(10.7), Inches(1.6))
    m_tf = m_tb.text_frame
    mp1 = m_tf.paragraphs[0]
    mp1.text = "THÔNG TIN SINH VIÊN BẢO VỆ:"
    mp1.font.size = Pt(13)
    mp1.font.bold = True
    mp1.font.color.rgb = PRIMARY
    mp1.space_after = Pt(6)

    mp2 = m_tf.add_paragraph()
    mp2.text = "Họ và tên: NGUYỄN TUẤN ĐẠT      |      Mã sinh viên: DTC245200452      |      Lớp: K23C"
    mp2.font.size = Pt(16)
    mp2.font.bold = True
    mp2.font.color.rgb = TEXT_MAIN
    mp2.space_after = Pt(4)

    mp3 = m_tf.add_paragraph()
    mp3.text = "Học phần: Triển khai và Quản trị Hệ thống Phần mềm   •   Năm học: 2025 - 2026   •   Thái Nguyên"
    mp3.font.size = Pt(13)
    mp3.font.color.rgb = TEXT_MUTED

    # -------------------------------------------------------------------------
    # SLIDE 2: MỤC TIÊU VÀ BỐI CẢNH DỰ ÁN
    # -------------------------------------------------------------------------
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_dark_bg(s2)
    add_header(s2, "1. Tổng Quan Bài Toán & Mục Tiêu Triển Khai")

    add_card(s2, 0.8, 1.8, 3.6, 5.0, "Vấn Đề Thực Tiễn", [
        "Hệ thống bán vé giờ cao điểm chịu tải đột biến (Flash Traffic).",
        "Nguy cơ cao xảy ra xung đột: 2 khách hàng đặt trùng 1 ghế tại cùng 1 giây (Race Condition).",
        "Thiếu cơ chế giám sát thời gian thực dẫn đến khó phát hiện sự cố máy chủ kịp thời.",
        "Môi trường phân mảnh giữa máy phát triển và máy chấm thi."
    ])

    add_card(s2, 4.8, 1.8, 3.8, 5.0, "Giải Pháp Kỹ Thuật", [
        "Web App Full-stack hoàn chỉnh (Node.js/Express + MySQL 3NF).",
        "Tuyệt đối không phải web tĩnh: Lưu trữ động, sinh vé điện tử có mã QR.",
        "ACID Transaction với cơ chế khóa dòng 'FOR UPDATE' chống đặt trùng ghế.",
        "Cổng Nginx Reverse Proxy bảo mật SSL/TLS, ngăn chặn tấn công DDoS/Spam."
    ], border_color=PRIMARY)

    add_card(s2, 8.9, 1.8, 3.6, 5.0, "Mục Tiêu Đạt Chuẩn", [
        "Tiêu chí 1: Kiến trúc Full-stack & Database động 3NF.",
        "Tiêu chí 2: Reverse Proxy Nginx & Bảo mật Container Non-root.",
        "Tiêu chí 3: Cụm Prometheus + Grafana giám sát toàn diện.",
        "Tiêu chí 4: Hệ thống Log tập trung Grafana Loki & Promtail.",
        "Tiêu chí 5: Khởi động 1 chạm tự động (RUN.bat) mọi máy tính."
    ], badge_text="GOAL", border_color=ACCENT_GOLD)

    # -------------------------------------------------------------------------
    # SLIDE 3: KIẾN TRÚC TỔNG THỂ HỆ THỐNG
    # -------------------------------------------------------------------------
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_dark_bg(s3)
    add_header(s3, "2. Kiến Trúc Triển Khai Đa Tầng (Multi-Tier Architecture)")

    add_card(s3, 0.8, 1.8, 3.6, 5.0, "Tầng Cổng Vào (Gateway)", [
        "Nginx Reverse Proxy (Alpine).",
        "SSL/TLS Termination tự ký an toàn.",
        "HTTP (Port 80) tự động chuyển hướng 301 sang HTTPS (Port 443).",
        "Security Headers: X-Frame, X-XSS, HSTS, X-Content-Type.",
        "Rate Limiting: Giới hạn tối đa 5 req/s cho API đặt vé."
    ])

    add_card(s3, 4.8, 1.8, 3.8, 5.0, "Tầng Nghiệp Vụ & Dữ Liệu", [
        "Web App Node.js v20 LTS (Port 3000).",
        "Chạy dưới Non-root user (node:node).",
        "Phân tách 2 mạng Docker Network riêng biệt: frontend_net và backend_net.",
        "MySQL 8.0 chuẩn 3NF: Lưu lịch chiếu, phòng chiếu, đặt vé và người dùng.",
        "Khóa ACID Transaction khi đặt vé."
    ], border_color=PRIMARY)

    add_card(s3, 8.9, 1.8, 3.6, 5.0, "Tầng Giám Sát & Log", [
        "Prometheus (Port 9090): Cào chỉ số hệ thống và ứng dụng Node.js.",
        "Grafana (Port 3001): Trực quan hóa số liệu qua Dashboard tự động nạp.",
        "Loki (Port 3100) & Promtail: Thu gom log máy chủ và phân tích LogQL.",
        "phpMyAdmin (Port 8080): Quản trị trực quan CSDL."
    ])

    # -------------------------------------------------------------------------
    # SLIDE 4: TÍNH NĂNG NGHIỆP VỤ NỔI BẬT
    # -------------------------------------------------------------------------
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_dark_bg(s4)
    add_header(s4, "3. Các Tính Năng Nghiệp Vụ Cốt Lõi Đã Hoàn Thiện")

    add_card(s4, 0.8, 1.8, 5.6, 2.4, "🎬 Danh Mục Phim & Suất Chiếu", [
        "Giao diện chuẩn Dark Cinema sang trọng, lọc phim chiếu rạp và sự kiện ca nhạc.",
        "Chi tiết suất chiếu theo phòng chiếu tiêu chuẩn, phòng IMAX và Dolby Atmos."
    ])

    add_card(s4, 6.8, 1.8, 5.7, 2.4, "💺 Sơ Đồ Ghế Ngồi 3D Thông Minh", [
        "Mô phỏng màn hình vòm cong 3D rạp chiếu hiện đại.",
        "Phân loại ghế: Ghế Standard, Ghế VIP, Ghế Sweetbox đôi.",
        "Ghế đã đặt bị khóa tự động theo dữ liệu thực từ CSDL MySQL."
    ])

    add_card(s4, 0.8, 4.4, 5.6, 2.4, "💳 Thanh Toán & Chống Trùng Ghế", [
        "Mô phỏng thanh toán MoMo, VNPAY QR, Chuyển khoản ngân hàng.",
        "Thuật toán ACID khóa dòng CSDL đảm bảo không bao giờ bị trùng ghế."
    ])

    add_card(s4, 6.8, 4.4, 5.7, 2.4, "🎫 Vé Điện Tử E-Ticket & Mã QR", [
        "Sinh mã vé tự động chuẩn mã sinh viên: TKT-DTC24520-XXXX.",
        "Mã QR Code tra cứu tức thì, có nút 'In vé / Lưu PDF' trực tiếp."
    ])

    # -------------------------------------------------------------------------
    # SLIDE 5: GIÁM SÁT PROMETHEUS, GRAFANA VÀ LOKI
    # -------------------------------------------------------------------------
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_dark_bg(s5)
    add_header(s5, "4. Giám Sát Hiệu Năng & Hệ Thống Log Tập Trung")

    add_card(s5, 0.8, 1.8, 3.6, 5.0, "Prometheus Metrics", [
        "Endpoint nội bộ: /metrics của ứng dụng Node.js.",
        "Thu thập metrics: Tần suất request HTTP, độ trễ phản hồi (Latency), RAM/CPU.",
        "Đo lường Business Metrics: Tổng số vé đã đặt, doanh thu tích lũy theo thời gian thực."
    ])

    add_card(s5, 4.8, 1.8, 3.8, 5.0, "Grafana Dashboards", [
        "Tự động Provisioning Datasource & Dashboard ngay khi khởi động.",
        "Trực quan hóa bảng đồng hồ CPU, Memory, Request Rate và Active Sessions.",
        "Cảnh báo ngưỡng quá tải tài nguyên thông qua màu sắc trực quan."
    ], border_color=PRIMARY)

    add_card(s5, 8.9, 1.8, 3.6, 5.0, "Loki & LogQL Truy Vấn", [
        "Lọc toàn bộ log ứng dụng: {container=\"ticket-app\"}",
        "Audit log nghiệp vụ: {container=\"ticket-app\"} |= \"BOOKING_SUCCESS\"",
        "Cảnh báo lỗi Nginx 4xx/5xx: {container=\"nginx\"} |~ \" (4[0-9]{2}|5[0-9]{2}) \""
    ], border_color=SUCCESS)

    # -------------------------------------------------------------------------
    # SLIDE 6: BẢO MẬT & ĐÓNG GÓI 1 CHẠM
    # -------------------------------------------------------------------------
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_dark_bg(s6)
    add_header(s6, "5. Biện Pháp Bảo Mật & Kịch Bản Khởi Động 1 Chạm")

    add_card(s6, 0.8, 1.8, 5.6, 5.0, "Biện Pháp Bảo Mật Cấp Hệ Thống", [
        "Non-root Container: Ứng dụng chạy dưới user 'node', loại bỏ nguy cơ chiếm quyền host.",
        "Docker Network Isolation: Cô lập hoàn toàn MySQL trong mạng backend_net.",
        "Rate Limiting & Security Headers: Chống DDoS, clickjacking, XSS trên tầng Nginx.",
        "Giới hạn tài nguyên (Resource Limits): Khai báo giới hạn RAM/CPU cho từng service.",
        "ACID Transactions: Bảo toàn tính toàn vẹn dữ liệu tài chính và vé xem phim."
    ], border_color=PRIMARY)

    add_card(s6, 6.8, 1.8, 5.7, 5.0, "Kịch Bản Khởi Chạy 1 Chạm (RUN.bat)", [
        "Tự động phát hiện môi trường máy tính khi chấm thi:",
        "• Máy có Docker: Tự chạy 'docker compose up -d' nạp đầy đủ 6 containers.",
        "• Máy không có Docker: Tự động kích hoạt cơ chế Dual-Engine In-Memory siêu nhẹ.",
        "Tự động mở trình duyệt web điều hướng đến giao diện đặt vé.",
        "File STOP.bat đi kèm dọn dẹp sạch sẽ toàn bộ tiến trình sau khi hoàn thành buổi bảo vệ."
    ], border_color=ACCENT_GOLD)

    # -------------------------------------------------------------------------
    # SLIDE 7: KẾT LUẬN & HỎI ĐÁP
    # -------------------------------------------------------------------------
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_dark_bg(s7)

    c_box = s7.shapes.add_textbox(Inches(1.5), Inches(1.8), Inches(10.3), Inches(3.0))
    c_tf = c_box.text_frame
    c_tf.word_wrap = True

    cp1 = c_tf.paragraphs[0]
    cp1.text = "TỔNG KẾT & HOÀN THÀNH MỤC TIÊU HỌC PHẦN"
    cp1.font.size = Pt(20)
    cp1.font.bold = True
    cp1.font.color.rgb = PRIMARY
    cp1.alignment = PP_ALIGN.CENTER
    cp1.space_after = Pt(12)

    cp2 = c_tf.add_paragraph()
    cp2.text = "Hệ thống đáp ứng 100% các tiêu chí triển khai khắt khe của học phần:"
    cp2.font.size = Pt(15)
    cp2.font.color.rgb = TEXT_MAIN
    cp2.alignment = PP_ALIGN.CENTER
    cp2.space_after = Pt(8)

    cp3 = c_tf.add_paragraph()
    cp3.text = "✓ Ứng dụng động CSDL 3NF   ✓ Nginx SSL Proxy   ✓ Prometheus - Grafana - Loki   ✓ Khởi động 1 chạm"
    cp3.font.size = Pt(16)
    cp3.font.bold = True
    cp3.font.color.rgb = SUCCESS
    cp3.alignment = PP_ALIGN.CENTER
    cp3.space_after = Pt(30)

    cp4 = c_tf.add_paragraph()
    cp4.text = "XIN TRÂN TRỌNG CẢM ƠN QUÝ THẦY CÔ HỘI ĐỒNG!"
    cp4.font.size = Pt(28)
    cp4.font.bold = True
    cp4.font.color.rgb = ACCENT_GOLD
    cp4.alignment = PP_ALIGN.CENTER

    output_path = r"C:\Users\dathao\Downloads\KTHP PTTKHT\film\Slide_Bao_Ve_KTHP_De_11_Nguyen_Tuan_Dat.pptx"
    prs.save(output_path)
    print(f"Presentation saved successfully to {output_path}")

if __name__ == "__main__":
    create_deck()
