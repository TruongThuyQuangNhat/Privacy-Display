# 🔒 Privacy Display

> Mô phỏng tính năng **Privacy Display** trên Galaxy S26 Ultra — tự động che mờ nội dung nhạy cảm khi người khác nhìn vào màn hình của bạn.

![Ionic](https://img.shields.io/badge/Ionic-7.x-3880FF?style=flat&logo=ionic&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-17.x-DD0031?style=flat&logo=angular&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-6.x-119EFF?style=flat&logo=capacitor&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=flat&logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

---

## ✨ Tính năng

- **Hiệu chỉnh góc nghiêng** — Giữ nút 3 giây để lưu tư thế cầm điện thoại bình thường của bạn
- **Tự động che mờ** — Khi điện thoại bị nghiêng ra ngoài vùng an toàn, màn hình tối dần hoặc mờ nhòe
- **Vùng che linh hoạt** — Chọn hình chữ nhật, hình vuông hoặc hình tròn; kéo thả tự do trong màn hình
- **Toàn màn hình** — Tùy chọn che mờ toàn bộ thay vì chỉ một vùng
- **2 hiệu ứng** — Tối dần (Dim) hoặc mờ nhòe (Blur), chỉnh trong Settings
- **Dark / Light Mode** — Chuyển đổi giao diện theo sở thích
- **Lưu cài đặt** — Toàn bộ cấu hình được lưu lại, không cần setup lại mỗi lần mở
- **Hỗ trợ Web & Native** — Chạy trên trình duyệt (PWA) và app Capacitor (Android/iOS)

---

## 📸 Giao diện

| Setup | Home | Settings |
|:---:|:---:|:---:|
| Hiệu chỉnh góc nghiêng | Kéo thả vùng che | Tuỳ chỉnh hiệu ứng |

---

## 🚀 Demo

🌐 **[Live Demo](https://privacy-display-chi.vercel.app)**

> Mở bằng **Chrome trên Android** hoặc **Safari trên iOS** để trải nghiệm đầy đủ tính năng cảm biến.

---

## 🛠 Công nghệ sử dụng

| Công nghệ | Mục đích |
|---|---|
| [Ionic 7](https://ionicframework.com) | UI framework, components |
| [Angular 17](https://angular.io) | Frontend framework |
| [Capacitor 6](https://capacitorjs.com) | Native bridge (iOS/Android) |
| [@capacitor/motion](https://capacitorjs.com/docs/apis/motion) | Đọc cảm biến con quay hồi chuyển |
| [@capacitor/preferences](https://capacitorjs.com/docs/apis/preferences) | Lưu cài đặt persistent |
| [Vercel](https://vercel.com) | Deploy web/PWA |

---

## ⚙️ Cài đặt & Chạy local

### Yêu cầu
- Node.js >= 18
- npm >= 9
- Ionic CLI: `npm install -g @ionic/cli`

### Clone & cài dependencies

```bash
git clone https://github.com/ten-ban/privacy-display.git
cd privacy-display
npm install
```

### Chạy trên trình duyệt

```bash
ionic serve
```

> Trên desktop browser sẽ không có cảm biến. Dùng Chrome DevTools → Sensors để giả lập `deviceorientation`.

### Build production

```bash
ionic build --prod
```

### Chạy trên Android

```bash
npx cap add android
npx cap sync
npx cap run android
```

### Chạy trên iOS

```bash
npx cap add ios
npx cap sync
npx cap run ios
```

---

## 📁 Cấu trúc project

```
src/
├── app/
│   ├── services/
│   │   ├── motion.service.ts     # Cảm biến (Capacitor + Web fallback)
│   │   └── settings.service.ts   # Quản lý & lưu cài đặt
│   ├── setup/                    # Màn hình hiệu chỉnh góc nghiêng
│   ├── tabs/                     # Tab navigation
│   ├── home/                     # Màn hình chính + điều khiển vùng che
│   └── settings/                 # Cài đặt hiệu ứng, theme, re-calibrate
├── theme/
│   └── variables.scss            # CSS variables cho Dark/Light mode
└── assets/
```

---

## 📱 Hỗ trợ trình duyệt & thiết bị

| Nền tảng | Hỗ trợ | Ghi chú |
|---|---|---|
| Chrome Android | ✅ Đầy đủ | Không cần xin permission |
| Samsung Internet | ✅ Đầy đủ | |
| Safari iOS | ✅ Đầy đủ | Cần cho phép truy cập Motion khi được hỏi |
| Chrome iOS | ✅ Đầy đủ | Dùng engine Safari bên dưới |
| Desktop Chrome | ⚠️ Giới hạn | Không có sensor vật lý, dùng DevTools Sensors để test |
| Android App (Capacitor) | ✅ Native | Dùng `@capacitor/motion` trực tiếp |
| iOS App (Capacitor) | ✅ Native | Dùng `@capacitor/motion` trực tiếp |

---

## 🧠 Cách hoạt động

```
Sensor đọc beta (trước/sau) & gamma (trái/phải)
                    │
                    ▼
     deviation = √( (β - β₀)² + (γ - γ₀)² )
                    │
          ┌─────────┴──────────┐
          │                    │
   deviation ≤ tolerance   deviation > tolerance
          │                    │
    Hiển thị bình           opacity tăng dần
    thường ✅               từ 0 → 0.92
                            blur tăng từ 0 → 22px
```

**β₀, γ₀** là góc nghiêng chuẩn bạn đã lưu trong bước Setup.
**tolerance** là vùng chấp nhận lệch (mặc định ±10°, chỉnh được trong Settings).

---

## 🚢 Deploy lên Vercel

```bash
npm install -g vercel
ionic build --prod
vercel login
vercel --prod
```

Hoặc kết nối GitHub repo → Vercel tự động deploy mỗi lần `git push`.

Chi tiết xem tại [`vercel.json`](./vercel.json).

---

## 🤝 Đóng góp

Mọi ý kiến đóng góp đều được hoan nghênh!

1. Fork repo
2. Tạo branch: `git checkout -b feature/ten-tinh-nang`
3. Commit: `git commit -m 'Add: mô tả tính năng'`
4. Push: `git push origin feature/ten-tinh-nang`
5. Tạo Pull Request

---

## 📄 License

Dự án này sử dụng giấy phép [MIT](./LICENSE).

---

<p align="center">
  Made with ❤️ using Ionic + Angular + Capacitor
</p>
