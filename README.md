# Sampark (Ongoing)

Sampark is a privacy-first vehicle communication platform.
It allows people to contact a vehicle owner via QR code without exposing personal phone numbers.

## Tech Stack

- Frontend: React (Vite), React Router, Axios, Framer Motion, GSAP, Tailwind CSS
- Backend: Node.js, Express, MongoDB (Mongoose), JWT auth, Multer uploads
- Integrations: PayU (payments), Exotel (masked calling), DigiLocker-ready verification flow

## Core Features

- OTP login with JWT authentication
- Vehicle registration with document upload (RC, DL, plate photo)
- Verification pipeline with manual review support
- Signed public QR flow
- Sending predefined/custom messages
- Masked call attempts and call status polling
- Emergency call-chain workflow
- Payment and renewal flow for QR activation
- Physical card ordering and admin order management
- Notification center with unread counters and filters
- User settings
- Profile edits and avatar upload
- Notification preferences and language setting
- Change phone with OTP re-verification
- Data export and account deletion flow
- Privacy score breakdown and progress indicators
- Admin panel for flagged verification reviews and order status updates

## Project Structure

```text
sampark/
|-- client/   # React app (Vite)
`-- server/   # Express API + MongoDB
```

## Quick Start

### 1) Backend

```bash
cd server
npm install
cp .env.example .env   # on PowerShell: Copy-Item .env.example .env
npm run dev
```

Server runs on `http://localhost:5000` by default.

### 2) Frontend

```bash
cd client
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` by default.

Vite proxy is configured so frontend requests to `/api/*` are forwarded to `http://localhost:5000`.

## Backend Environment Variables

At minimum, configure:

- `PORT` (default `5000`)
- `MONGO_URI`
- `JWT_SECRET`

Commonly used optional variables in current code:

- `NODE_ENV`
- `APP_URL` (default `http://localhost:5173`)
- `FRONTEND_URL` (default `http://localhost:5173`)
- `QR_SECRET`
- `PHONE_ENCRYPT_KEY`
- `MOCK_CALLS` (`true` for local mocked call flows)
- `VERIFICATION_MODE` (`basic` or `digilocker`)
- `PAYU_MERCHANT_KEY`
- `PAYU_MERCHANT_SALT`
- `PAYU_ENV` (`prod` or test)
- `PAYU_PLAN_AMOUNT` (default `499`)

## Scripts

### Server (`server/package.json`)

- `npm run dev` -> Start server with watch mode
- `npm start` -> Start server normally

### Client (`client/package.json`)

- `npm run dev` -> Start Vite dev server
- `npm run build` -> Production build
- `npm run preview` -> Preview production build
- `npm run lint` -> Run ESLint

## API Surface (High Level)

- `/api/v1/auth` -> OTP login/auth
- `/api/v1/auth/digilocker` -> DigiLocker OAuth flow
- `/api/v1/users` -> User profile and settings
- `/api/v1/vehicles` -> Vehicle registration and owner vehicle actions
- `/api/v1/v` -> Public scan routes
- `/api/v1/payments` -> QR activation/renewal payments
- `/api/v1/orders` -> Physical card ordering
- `/api/v1/notifications` -> Notification APIs
- `/api/v1/admin` -> Admin verification and order management

## Notes

- This project is actively evolving.
- If you add new integrations or routes, update this README and `server/.env.example` together.
