<div align="center">

# 🛡️ SAMPAARK

### Privacy-First Vehicle Identity & Emergency Communication Platform

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0+-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Exotel](https://img.shields.io/badge/Exotel-Telecom_API-FF6B35?style=for-the-badge)](https://exotel.com/)
[![PayU](https://img.shields.io/badge/PayU-Payments-00C853?style=for-the-badge)](https://payu.in/)

**Replace your dashboard phone number with a cryptographically signed QR code.**
Anyone scans it → Calls, SMS, or Emergency — without ever seeing your real number.

[🚀 Getting Started](#-getting-started) · [📐 Architecture](#-system-architecture) · [🔄 User Flows](#-user-flows) · [🛠️ API Reference](#%EF%B8%8F-api-reference)

</div>

<img src="Home.png">


---

## 🚨 The Problem

170 million vehicles in India display owner phone numbers on their dashboards — creating vectors for spam, stalking, harassment, and social engineering. But removing the number means nobody can reach you in a parking emergency.

**The paradox:** You *need* to be reachable for your parked vehicle, but displaying your number makes you vulnerable.

---

## 💡 The Solution

Sampaark replaces your dashboard number with a QR code enabling masked communication — neither party ever sees the other's real phone number.
<img src="SamparkCard.png">

```mermaid
flowchart LR
    A["📱 Old Way\nReal number on dashboard\n❌ No privacy\n❌ No control"] -->|Replace with| B["🔲 Sampaark QR\nMH-12-AB-1234\n✅ Number hidden\n✅ Full control\n✅ Emergency chain"]

    style A fill:#2D0A0A,color:#FF6B6B,stroke:#FF3B5C
    style B fill:#0A2D1A,color:#00E5A0,stroke:#00E5A0
```

**How it works:** Sign up → verify vehicle docs → pay ₹499/year → get a signed QR for your dashboard. Anyone scans it with any camera — no app needed — and can Call, SMS, or raise an Emergency, all masked.

---

## ✨ Key Features

| For Vehicle Owners | For QR Scanners | For Admins |
|---|---|---|
| 🔒 Masked calls & SMS via Exotel | 📱 No app required — any browser | 📈 Analytics with Recharts |
| 🚨 Emergency call chain (owner → EC1 → EC2 → EC3 → SMS) | 📞 One-tap masked call | 🚩 Abuse management + auto-moderation |
| 🎛️ Comm modes: All / Message Only / Silent | 💬 Pre-written SMS templates | 🎫 Full support ticketing |
| 📊 Activity dashboard with caller hashes | 🚨 Emergency bypasses all blocks | 📦 Order pipeline management |
| 🛡️ Privacy score 0–100 | 🔁 Call-to-SMS fallback | — |
| 🔄 Secure vehicle transfer (48h code) | — | — |

---

## 📐 System Architecture

```mermaid
graph TB
    subgraph Users["👤 Users"]
        A[Vehicle Owner]
        B[QR Scanner]
        C[Admin]
    end

    subgraph Frontend["🌐 Frontend — React + Vite"]
        D[Auth / Dashboard / Settings]
        E[Public Scan Page]
        F[Admin Panel]
    end

    subgraph Backend["⚙️ Backend — Node.js + Express"]
        G[Auth Routes]
        H[Vehicle Routes]
        I[Public Routes]
        J[Payment Routes]
        K[Admin Routes]
    end

    subgraph Services["🔌 Services"]
        L[Exotel — Masked Calls & SMS]
        M[Emergency Chain]
        N[Auto-Verification]
        O[Notification Service]
        P[Auto-Moderation]
    end

    subgraph Data["💾 Data Layer"]
        Q[(MongoDB Atlas)]
        R[(Redis — OTP & Rate Limits)]
    end

    subgraph External["🔗 External APIs"]
        S[Exotel]
        T[PayU]
        U[DigiLocker]
    end

    A --> D
    B --> E
    C --> F
    D --> G & H & J
    E --> I
    F --> K
    G & H & I & J & K --> Q & R
    I --> L & M & P
    H --> N
    N --> U
    L --> S
    J --> T
    M --> L
    O --> Q
```

### QR Scan → Masked Call: Request Flow

```mermaid
sequenceDiagram
    participant Scanner as 📱 Scanner
    participant Frontend as ⚛️ React App
    participant Backend as ⚙️ Express API
    participant DB as 💾 MongoDB
    participant Exotel as 📞 Exotel
    participant Owner as 📱 Owner

    Scanner->>Frontend: Scans QR → opens /v/{id}?sig={hmac}
    Frontend->>Backend: GET /v/{id}?sig={hmac}
    Backend->>Backend: Verify HMAC-SHA256 signature
    Backend->>DB: Find vehicle, check status & expiry
    DB-->>Backend: plate_number, comm_mode, active
    Backend-->>Frontend: Plate + available actions
    Frontend-->>Scanner: Call / SMS / Emergency buttons

    Scanner->>Frontend: Taps "Call", enters phone
    Frontend->>Backend: POST /v/{id}/call
    Backend->>DB: Check blocklist + rate limits
    Backend->>Exotel: initiateCall(caller, owner_virtual)
    Exotel->>Scanner: Rings scanner
    Exotel->>Owner: Rings owner (virtual number shown)

    alt Owner Answers
        Exotel-->>Backend: status=completed
    else No Answer
        Exotel-->>Backend: status=no-answer
        Backend-->>Frontend: fallback_token
        Frontend-->>Scanner: "Owner didn't answer. Send SMS?"
        Scanner->>Backend: POST /v/{id}/fallback-message
        Backend->>Exotel: sendMaskedSMS → Owner
    end
```

### Emergency Chain Flow

```mermaid
sequenceDiagram
    participant Scanner as 📱 Scanner
    participant Backend as ⚙️ Backend
    participant Exotel as 📞 Exotel
    participant Owner as 👤 Owner
    participant EC1 as 🆘 EC 1
    participant EC2 as 🆘 EC 2

    Scanner->>Backend: POST /v/{id}/emergency { reason, phone }

    rect rgb(80, 20, 20)
        Note over Backend,Owner: Step 1 — Call Owner (30s timeout)
        Backend->>Exotel: Call owner
        Exotel->>Owner: ☎️ Ringing...
        alt Answers
            Owner-->>Backend: ✅ Connected
        else No Answer
            Exotel-->>Backend: ❌ no-answer
        end
    end

    rect rgb(80, 50, 10)
        Note over Backend,EC1: Step 2 — Call EC1 (30s timeout)
        Backend->>Exotel: Call EC1
        Exotel->>EC1: ☎️ Ringing...
        alt Answers
            EC1-->>Backend: ✅ Connected
        else No Answer
            Exotel-->>Backend: ❌ no-answer
        end
    end

    rect rgb(20, 40, 80)
        Note over Backend,EC2: Step 3 — SMS Fallback to Everyone
        Backend->>Exotel: SMS → Owner, EC1, EC2, EC3
        Backend-->>Scanner: "Alert sent to all contacts"
    end
```

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite, Tailwind CSS, Recharts |
| Backend | Node.js + Express |
| Database | MongoDB Atlas + Mongoose |
| Cache | Redis (ioredis) — OTP & rate limiting |
| Auth | JWT + Phone OTP |
| Telecom | Exotel — masked calls & SMS |
| Payments | PayU — UPI, cards, net banking |
| Verification | DigiLocker API / Basic OCR |
| QR | qrcode (npm) + HMAC-SHA256 signing |
| Encryption | AES-256 (storage) + SHA-256 (lookups) |

---

## 🔄 User Flows

### Registration → Active QR

```mermaid
flowchart TD
    A([🆕 New User]) --> B[Enter Phone + OTP]
    B --> C{OTP Valid?}
    C -->|❌| B
    C -->|✅| D[Set Profile Name]
    D --> E[Register Vehicle]
    E --> F[Upload RC + DL + Plate Photo]
    F --> G{Verification Mode}
    G -->|Basic| H[Auto-Verify Instantly]
    G -->|DigiLocker| I[OAuth Flow]
    I --> J{Match?}
    J -->|❌| F
    J -->|✅| H
    H --> K[💳 Pay ₹499 via PayU]
    K --> L{Payment OK?}
    L -->|❌| K
    L -->|✅| M([🎉 QR Generated — Active!])

    style A fill:#1a1a2e,color:#00E5A0,stroke:#00E5A0
    style M fill:#0A2D1A,color:#00E5A0,stroke:#00E5A0
    style J fill:#2D0A0A,color:#FF6B6B,stroke:#FF3B5C
```

### Public QR Scan — All Paths

```mermaid
flowchart TD
    A([📱 Scan QR]) --> B{Signature Valid?}
    B -->|❌ Tampered| C[⚠️ Invalid QR]
    B -->|✅| D{Vehicle Status}
    D -->|Deactivated| E[🔒 Not Registered]
    D -->|Suspended| F[⛔ Unavailable]
    D -->|Expired| G[⏰ QR Expired]
    D -->|Active| H{Comm Mode}
    H -->|All| I[Call + SMS + Emergency]
    H -->|Message Only| J[SMS + Emergency]
    H -->|Silent| K[Emergency Only]
    I & J & K --> L{Action}
    L -->|📞 Call| M{Caller Blocked?}
    M -->|Yes| N[❌ Unable to contact]
    M -->|No| O[Exotel Masked Call]
    O --> P{Answered?}
    P -->|✅| Q[📞 Connected!]
    P -->|❌| R[💬 Fallback SMS]
    L -->|💬 SMS| S[Masked SMS via Exotel]
    L -->|🚨 Emergency| T[Call Chain → SMS Fallback]

    style A fill:#1a1a2e,color:#00E5A0,stroke:#00E5A0
    style Q fill:#0A2D1A,color:#00E5A0,stroke:#00E5A0
    style N fill:#2D0A0A,color:#FF6B6B,stroke:#FF3B5C
    style C fill:#2D0A0A,color:#FF6B6B,stroke:#FF3B5C
```

### QR Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Unverified: Vehicle Registered
    Unverified --> Verified: Auto-Verification Passes
    Unverified --> VerificationFailed: Checks Failed
    VerificationFailed --> Unverified: Re-upload
    Verified --> Active: Payment ₹499
    Active --> Suspended: Admin Action
    Suspended --> Active: Unsuspended
    Active --> TransferPending: Initiate Transfer
    TransferPending --> Active: Cancelled / Expired
    TransferPending --> NeedsReverification: New Owner Claims
    NeedsReverification --> Active: Verified + Paid
    Active --> Expired: QR Valid Period Ends
    Expired --> Active: Renewal ₹499
    Active --> Deactivated: Owner Deletes
    Deactivated --> [*]
```

---

## 📊 Data Models

```mermaid
erDiagram
    USER ||--o{ VEHICLE : owns
    USER ||--o{ PAYMENT : makes
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ SUPPORT_TICKET : creates
    USER ||--o{ ORDER : places
    VEHICLE ||--o{ EMERGENCY_CONTACT : has
    VEHICLE ||--o{ CALL_LOG : receives
    VEHICLE ||--o{ ABUSE_REPORT : reported_on
    VEHICLE ||--o{ BLOCKLIST : has
    CALL_LOG ||--o| ABUSE_REPORT : may_trigger

    USER {
        ObjectId _id PK
        String phone_hash "SHA-256 indexed"
        String phone_encrypted "AES-256"
        String name
        String role "user | admin"
        Number privacy_score "0-100"
        Date deleted_at "soft delete"
    }
    VEHICLE {
        ObjectId _id PK
        ObjectId user_id FK
        String plate_number
        String status "verified | suspended | deactivated"
        String comm_mode "all | message_only | silent"
        String qr_token "HMAC-signed"
        Date qr_valid_until
        String transfer_status "none | pending | completed"
    }
    CALL_LOG {
        ObjectId _id PK
        ObjectId vehicle_id FK
        String caller_hash "SHA-256"
        String type "call | sms | emergency"
        String status "completed | no-answer | busy | failed"
        String emergency_chain_id
        Date created_at
    }
    PAYMENT {
        ObjectId _id PK
        ObjectId vehicle_id FK
        String payu_payment_id
        Number amount "paise"
        String status "created | paid | failed"
        Date valid_until
    }
    BLOCKLIST {
        ObjectId _id PK
        ObjectId vehicle_id FK
        String caller_hash
        String block_type "vehicle_specific | global"
        Date expires_at "null = permanent"
    }
```

---

## 🛠️ API Reference

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/auth/send-otp` | ❌ | Send OTP |
| `POST` | `/api/v1/auth/verify-otp` | ❌ | Verify OTP → JWT |
| `GET` | `/api/v1/users/me` | 🔐 | Current user + privacy score |

### Vehicles
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/vehicles` | 🔐 | Register (multipart: RC, DL, photo) |
| `GET` | `/api/v1/vehicles` | 🔐 | List user's vehicles |
| `GET` | `/api/v1/vehicles/:id` | 🔐 | Detail with call logs |
| `POST` | `/api/v1/vehicles/:id/transfer/initiate` | 🔐 | Start transfer → 48h code |
| `POST` | `/api/v1/vehicles/transfer/claim` | 🔐 | Claim with transfer code |
| `DELETE` | `/api/v1/vehicles/:id` | 🔐 | Soft-delete |

### Public (QR Scan — No Auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/v/:id` | Validate QR, return plate + comm_mode |
| `POST` | `/api/v1/v/:id/call` | Initiate masked call |
| `POST` | `/api/v1/v/:id/sms` | Send masked SMS |
| `POST` | `/api/v1/v/:id/emergency` | Trigger emergency chain |
| `GET` | `/api/v1/v/:id/emergency-status/:chainId` | Poll chain progress |
| `POST` | `/api/v1/v/:id/fallback-message` | SMS after missed call |
| `POST` | `/api/v1/v/:id/report` | Report QR/vehicle issue |

### Payments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/payments/create-order` | 🔐 | Create PayU order |
| `POST` | `/api/v1/payments/verify` | 🔐 | Verify signature → generate QR |
| `POST` | `/api/v1/payments/renew` | 🔐 | Renewal order |

### Admin
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/admin/analytics` | 👑 | Full analytics |
| `GET/PUT` | `/api/v1/admin/abuse-reports/:id` | 👑 | Review + action |
| `GET/DELETE` | `/api/v1/admin/blocklist/:id` | 👑 | Manage blocks |
| `PUT` | `/api/v1/admin/suspended-vehicles/:id/unsuspend` | 👑 | Unsuspend |
| `GET/PUT` | `/api/v1/admin/orders/:id` | 👑 | Order pipeline |
| `GET/POST/PUT` | `/api/v1/admin/support/:id` | 👑 | Support tickets |

### Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/webhooks/exotel` | Call status → triggers fallback chain |
| `POST` | `/api/v1/webhooks/payu` | Payment status updates |

> 🔐 JWT Bearer required · 👑 Admin role required · ❌ Public

---

## 🔒 Security Architecture

```mermaid
flowchart LR
    subgraph Auth["🔐 Auth"]
        A[OTP via SMS] --> B[JWT — 7d expiry]
    end
    subgraph Encryption["🔑 Encryption"]
        C[Phone Numbers] --> D[AES-256 at rest]
        C --> E[SHA-256 for lookups]
    end
    subgraph QR["📝 QR Signing"]
        F[Vehicle ID + Secret] --> G[HMAC-SHA256]
        G --> H{Sig Valid?}
        H -->|❌| I[403 Forbidden]
        H -->|✅| J[Serve Page]
    end
    subgraph RateLimits["🛡️ Rate Limits"]
        K[OTP: 3/10min]
        L[Calls: 3/hr per caller]
        M[SMS: 5/hr per caller]
        N[Public scan: 30/min]
    end
```

| Layer | Measure |
|-------|---------|
| Transport | HTTPS enforced |
| Auth | JWT + OTP — phone-verified only |
| Phone Storage | AES-256 encrypted + SHA-256 hashed |
| QR URLs | HMAC-SHA256 signed, server-validated |
| Public Page | Zero PII — only plate number shown |
| Compliance | DPDP Act: data export, soft deletes, anonymized logs |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+, MongoDB (Atlas free tier), Redis, Exotel account, PayU account

```bash
git clone https://github.com/yourusername/sampaark.git

# Backend
cd server && npm install && cp .env.example .env && npm run dev

# Frontend
cd client && npm install && cp .env.example .env && npm run dev
```

### Mock Mode (Dev)
Set `MOCK_CALLS=true` in `.env`:
- Phones ending in `0` → no-answer, `1` → busy, others → connected
- Emergency chain simulates full cascade with 3s delays
- PayU test card: `4111 1111 1111 1111`, OTP: `1234`

---

## ⚙️ Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://...
JWT_SECRET=min_32_chars
ENCRYPTION_KEY=exactly_32_chars
QR_SECRET=your_hmac_secret
REDIS_URL=redis://localhost:6379

# Exotel
EXOTEL_API_KEY=...
EXOTEL_API_TOKEN=...
EXOTEL_SID=...
EXOTEL_VIRTUAL_NUMBER=...
MOCK_CALLS=true

# PayU
PAYU_KEY=...
PAYU_SALT=...
PAYU_BASE_URL=https://test.payu.in

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

```env
# client/.env
VITE_API_URL=http://localhost:5000/api/v1
VITE_PAYU_KEY=your_merchant_key
```

---

## 📁 Project Structure

```
sampaark/
├── server/
│   ├── models/          # User, Vehicle, CallLog, EmergencyContact, Payment...
│   ├── routes/          # auth, vehicles, public, payments, admin, webhooks
│   ├── middleware/       # auth.js, adminAuth.js, errorHandler.js
│   ├── services/        # exotel, emergencyChain, notificationService, autoModeration
│   ├── utils/           # otp, qr, encryption, privacyScore, analytics
│   └── index.js
└── client/
    └── src/
        ├── pages/       # Login, Dashboard, RegisterVehicle, PublicScan, Settings, admin/*
        ├── components/  # QRCard, PrivacyScore, PaymentButton, InstallPrompt
        ├── layouts/     # AdminLayout
        └── api/         # axios.js with JWT interceptor
```

---

## 💰 Revenue Model

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'pie1': '#FF6B6B', 'pie2': '#4ECDC4', 'pie3': '#FFE66D', 'pie4': '#A78BFA', 'pieTextColor': '#ffffff', 'pieLegendTextColor': '#ffffff', 'pieStrokeColor': '#1a1a2e', 'pieOpacity': '1', 'background': '#1a1a2e', 'mainBkg': '#1a1a2e'}}}%%
pie title Revenue Streams
    "QR Subscription ₹499/yr" : 65
    "Physical Card ₹99–199" : 15
    "B2B Fleet Plans" : 15
    "Premium Features" : 5
```

| Stream | Price | Model |
|--------|-------|-------|
| QR Subscription | ₹499/year/vehicle | Recurring — primary |
| Physical Card | ₹99 standard / ₹199 express | One-time |
| B2B Fleet | Custom | Gated communities, corporate |
| Premium (future) | TBD | Multi-language, priority support |

---

## 🗺️ Roadmap

**v1.0 — Complete**
OTP auth · Vehicle registration + document upload · Auto-verification · PayU payments · HMAC-signed QR · Masked calls & SMS via Exotel · Emergency call chain · QR expiry & renewal · Print + physical card ordering · Notification center · Privacy score · Admin analytics · Abuse management + auto-moderation · Support ticketing · PWA

**v2.0 — Planned**
DigiLocker production integration · Push notifications (Firebase) · Multi-language (Hindi + regional) · B2B fleet dashboard · WhatsApp Business API · AI abuse pattern detection · Insurance/toll integrations

---

<div align="center">

**Built with 🛡️ privacy in mind**

*Sampaark — Because your phone number shouldn't be public just because your car is parked.*

</div>
