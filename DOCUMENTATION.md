# Sampark — Complete Technical Documentation
### Explained for humans, not robots.

---

## Table of Contents

1. [The 10,000-foot view](#1-the-10000-foot-view)
2. [What "the server" actually is](#2-what-the-server-actually-is)
3. [What "the database" actually is](#3-what-the-database-actually-is)
4. [How the two apps talk to each other](#4-how-the-two-apps-talk-to-each-other)
5. [How login works (OTP + JWT)](#5-how-login-works-otp--jwt)
6. [How phone numbers are kept secret](#6-how-phone-numbers-are-kept-secret)
7. [How QR codes are made and verified](#7-how-qr-codes-are-made-and-verified)
8. [How calls happen without sharing numbers](#8-how-calls-happen-without-sharing-numbers)
9. [How payments work](#9-how-payments-work)
10. [How document verification works](#10-how-document-verification-works)
11. [How the emergency chain works](#11-how-the-emergency-chain-works)
12. [How abuse protection works](#12-how-abuse-protection-works)
13. [How files are stored and protected](#13-how-files-are-stored-and-protected)
14. [How the system protects itself from being overloaded](#14-how-the-system-protects-itself-from-being-overloaded)
15. [How errors are caught before they crash things](#15-how-errors-are-caught-before-they-crash-things)
16. [How vehicle transfer works](#16-how-vehicle-transfer-works)
17. [What every environment variable does](#17-what-every-environment-variable-does)
18. [What every folder and file does](#18-what-every-folder-and-file-does)
19. [How everything connects — the full map](#19-how-everything-connects--the-full-map)
20. [Running it yourself — the complete guide](#20-running-it-yourself--the-complete-guide)

---

## 1. The 10,000-foot view

Sampark is split into **two separate apps** that work together:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   THE WEBSITE (Frontend)          THE ENGINE (Backend)          │
│   ─────────────────────          ─────────────────────          │
│                                                                 │
│   What you see in your           The invisible half that        │
│   browser. Built in React.       does all the real work.        │
│   Runs on port 5173.             Built in Node.js.              │
│                                  Runs on port 5000.             │
│                                                                 │
│   "Show me this page"    ──→     "Here is the data"             │
│   "Do this action"       ──→     "Done. Here's what happened"   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Neither of these stores data permanently on their own. All data lives in a third place:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   THE DATABASE (MongoDB Atlas)                                  │
│   ─────────────────────────────                                 │
│                                                                 │
│   A database that lives on MongoDB's servers in Mumbai.         │
│   Stores all users, vehicles, calls, payments, everything.      │
│   The backend talks to it. The frontend never touches it.       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

And then there are external services that handle specific tasks Sampark doesn't do itself:

| Service | What it handles |
|---|---|
| **Exotel** | Making phone calls and sending SMS, all masked |
| **PayU** | Taking payments (UPI, cards, net banking) |
| **DigiLocker** | Verifying that uploaded documents are real |

---

## 2. What "the server" actually is

When people say "the server", they mean a program running on a computer somewhere that listens for requests and responds to them. In Sampark's case, this is the `server/` folder.

Think of it like a restaurant kitchen. You (the browser) are a customer placing an order. The kitchen (server) receives your order, does the work, and sends food back. You never go into the kitchen — you just get the result.

**The server is built with:**

- **Node.js** — the platform. Think of it as the electricity that powers everything. It lets JavaScript (normally a browser language) run on a server computer instead.
- **Express** — a tool that makes it easy to say "when someone visits this URL, do this thing." Like a receptionist that routes calls to the right department.

**Every "route" is a door into the kitchen:**

```
GET  /api/v1/vehicles          →  "Give me a list of my vehicles"
POST /api/v1/vehicles          →  "Register a new vehicle"
POST /api/v1/v/:vehicleId/call →  "Call this vehicle's owner"
```

The `GET` and `POST` are the type of request. `GET` = "give me something", `POST` = "do something / save something".

---

## 3. What "the database" actually is

The database is where everything is saved permanently. Think of it as a giant filing cabinet in the cloud. Every drawer in the filing cabinet is called a **collection**, and every document in a drawer is called a **document** (confusingly, despite having nothing to do with PDFs).

**MongoDB** is the filing cabinet brand. **MongoDB Atlas** is a managed version — MongoDB runs the physical computers for us, in Mumbai, India.

**Sampark's drawers (collections):**

| Collection | What it stores |
|---|---|
| `users` | Everyone who has an account — their encrypted phone, name, role |
| `vehicles` | Every registered vehicle — plate number, status, QR token, docs |
| `calllogs` | Every call, SMS, and emergency ever made through the system |
| `payments` | Every PayU transaction — amount, status, expiry date |
| `notifications` | In-app alerts shown in the bell icon |
| `supporttickets` | Help desk conversations |
| `scanlogs` | Every time a QR code was scanned |
| `abusereports` | Complaints filed about callers |
| `blocklists` | Callers who have been banned |
| `emergencysessions` | Live state of ongoing emergency call chains |
| `orders` | Physical QR card orders |

**Mongoose** is a tool that makes it easier to read/write to MongoDB from JavaScript. It's like a set of templates that defines what data is allowed to be saved — for example, saying "a vehicle must have a plate number, and that plate number must match the Indian format."

---

## 4. How the two apps talk to each other

The frontend and backend don't share code. They communicate over the internet using a system called **HTTP requests** — the same thing your browser uses to load any webpage.

Every piece of data the frontend needs, it asks for. Every action the user takes, the frontend sends to the backend.

```
┌──────────────┐   "GET /api/v1/vehicles"   ┌──────────────┐
│   Browser    │  ──────────────────────→   │   Server     │
│   (React)    │                            │  (Express)   │
│              │  ←──────────────────────   │              │
└──────────────┘   { vehicles: [...] }      └──────────────┘
```

All these requests go to URLs that start with `/api/v1/`. The frontend uses a helper called **Axios** to make these requests. Axios is configured to:

1. Automatically attach the user's login token to every request (so the server knows who is asking)
2. If the server says "your token is expired / invalid" (code 401), automatically log the user out and send them to the login page

The frontend runs on **port 5173** and the backend on **port 5000**. In development, there's a proxy configured so when the frontend calls `/api/v1/...`, it automatically knows to go to `http://localhost:5000/api/v1/...`.

---

## 5. How login works (OTP + JWT)

There are no passwords in Sampark. Login works with a one-time code sent to your phone (OTP).

**Step 1 — Send OTP:**
```
User types phone number → Server generates a random 6-digit number
→ Stores it in memory with a 5-minute timer
→ (In production: sends it via SMS. In dev: returns it in the response.)
```

**Step 2 — Verify OTP:**
```
User types the OTP → Server checks:
  ✓ Does it match what was stored?
  ✓ Has it expired? (5 minutes)
  ✓ Has it been guessed wrong 5 times already? (lockout)
→ If all good: creates the user account (or finds existing one)
→ Issues a JWT
```

**What is a JWT?**

JWT stands for "JSON Web Token". Ignore the full name. Think of it as a **digital ID card** that the server stamps and hands to you.

```
┌─────────────────────────────────────────────────────┐
│                  YOUR DIGITAL ID CARD               │
│                                                     │
│   Who you are:     userId = abc123                  │
│   Your role:       user (or admin)                  │
│   Expires:         30 days from now                 │
│   Stamp:           [server's secret signature]      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

This ID card is stored in your browser's `localStorage`. Every request to the server includes it in the header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

The server can verify the stamp without looking anything up — it just checks that nobody tampered with the card since it was issued.

**What makes a JWT expire or get invalidated?**

- 30 days pass → expired
- User changes their phone number → all old tokens rejected immediately
- User deletes their account → all old tokens rejected immediately

The server tracks a `token_invalidated_at` timestamp on each user. Any token issued before that time is rejected.

**OTP rate limits** (to stop people from spamming OTP requests):
- Max 3 OTPs sent per 10 minutes per phone number
- After 5 wrong guesses on a single OTP, that OTP is locked out (must request a new one)

---

## 6. How phone numbers are kept secret

This is the core privacy feature of Sampark. Phone numbers are never stored as-is.

When a phone number enters the system, it's immediately handled in two ways:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   REAL NUMBER:   98765 43210                                    │
│                                                                 │
│   ENCRYPTED COPY   →   a2f9b8:3d7e4f91c2...                    │
│   (for when we need to actually use it — e.g. to make a call)  │
│                                                                 │
│   HASHED COPY      →   7f3a9b2c4d...                           │
│   (for looking things up — e.g. "is this caller blocked?")     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Encryption (AES-256-CTR):**
Think of this as a lockbox. The number goes in, gibberish comes out. Only our server (with the secret key) can reverse it. We need to reverse it when making a call — we decrypt it to get the real number, pass it to Exotel, then throw away the decrypted version. The stored version is always gibberish.

**Hashing (SHA-256):**
Think of this as a fingerprint machine. The number goes in, a fingerprint comes out. The fingerprint is always the same for the same number, but you can't go backwards — you can't get the number from the fingerprint. This is used for comparisons: "Is this caller on the blocklist?" We hash the caller's number and compare the hash. No real number ever touches the blocklist.

**What gets shown to vehicle owners in their call logs:**
Just the last 4 digits, with the rest masked: `xxxxxx3210`

**The encryption key** must be set in the `.env` file as `PHONE_ENCRYPT_KEY`. If it's missing, the server refuses to start — this is intentional. Running without an encryption key would mean all phone numbers are stored in readable form.

---

## 7. How QR codes are made and verified

After a successful payment, Sampark generates a QR code for the vehicle. Here's what the QR code actually contains:

```
https://sampark.app/v/abc123vehicleid?sig=7f9a3b2c...
```

Just a URL. When someone scans it with their phone camera, their phone opens that URL in a browser.

**The `sig` part (the signature) is the important bit.**

The signature is generated using **HMAC-SHA256** — a mathematical formula that combines the vehicle's ID with a secret key only the server knows. The result is a unique fingerprint for that URL.

```
HMAC(vehicle_id + QR_SECRET) = "7f9a3b2c..."
```

When someone scans the QR and the browser opens that URL, the server:
1. Takes the vehicle ID from the URL
2. Takes the `sig` from the URL
3. Re-calculates what the signature *should* be using the same secret key
4. If they match → legitimate QR. If they don't → someone tampered with it → 403 blocked.

**This means:**
- Nobody can create a fake QR for a vehicle they don't own
- Nobody can alter a real QR to point to a different vehicle
- If a QR is expired, it's still mathematically valid — but the server separately checks the `qr_valid_until` date and rejects it

The QR image itself is generated using the `qrcode` npm package, which turns the URL into the classic black-and-white square pattern and stores it as a base64 data URL directly in the database.

---

## 8. How calls happen without sharing numbers

This is powered by **Exotel**, an Indian telecom company.

Exotel owns virtual phone numbers. When a call happens through Sampark:

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   Scanner's phone      →   Exotel virtual number            │
│                                ↕  (Exotel bridges them)     │
│   Owner's real phone   ←   Exotel virtual number            │
│                                                              │
│   Result: Scanner and Owner talk.                           │
│   Neither sees the other's real number.                      │
│   Both see an Exotel virtual number instead.                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**What Sampark actually does:**
1. Receives the call request from the user
2. Looks up the owner's phone number (decrypts it from the database)
3. Calls Exotel's API: "Please bridge a call between [scanner] and [owner]"
4. Exotel makes it happen
5. Exotel later calls Sampark back (via a webhook) to report what happened — answered, missed, busy, failed

**In dev/mock mode (`MOCK_CALLS=true`):**
No real calls happen. The system fakes the result based on the last digit of the phone number (0=no answer, 1=busy, anything else=connected). This lets the whole flow be tested without actual Exotel credentials.

**SMS works the same way:** Exotel sends the message from their virtual number. If the owner replies to that virtual number, Exotel calls Sampark's webhook with the reply, and Sampark stores it against the original call log.

---

## 9. How payments work

Payments go through **PayU**, one of India's major payment gateways (UPI, cards, net banking).

**The flow:**

```
1. User clicks "Get QR Card"
          ↓
2. Sampark creates a payment record in its database (status: created)
   and generates a "hash" — a mathematical signature of the payment details
          ↓
3. Sampark sends the user to PayU's website with:
   - The amount (₹499)
   - The transaction ID
   - The hash (so PayU can verify Sampark sent this, not someone random)
          ↓
4. User pays on PayU's website (enters UPI/card details there, not on Sampark)
          ↓
5. PayU sends the user back to Sampark with the payment result
          ↓
6. Sampark verifies PayU's result by:
   a. Re-calculating what the hash should be
   b. Comparing it to what PayU sent
   c. If they match → payment is real
          ↓
7. Sampark marks payment as "paid", sets validity 1 year from now,
   generates the QR code, and notifies the user
```

**Why calculate hashes?** Because anyone could fake a POST request saying "I paid successfully!" The hash is a mathematical fingerprint that can only be correctly produced if you know the secret salt (which only Sampark and PayU know). If someone fakes a payment success, their hash won't match.

**Replay protection:** Once a transaction is marked "paid", any future attempt to re-submit the same transaction result does nothing — the server recognizes it's already processed and just returns "already verified." This prevents someone from submitting one valid payment result multiple times to extend their QR indefinitely.

---

## 10. How document verification works

When a vehicle is registered, three documents are uploaded: RC (Registration Certificate), DL (Driving Licence), and a photo of the number plate.

There are two verification modes, controlled by the `VERIFICATION_MODE` environment variable:

**Basic mode** (`VERIFICATION_MODE=basic`):
The server checks that files were uploaded and looks plausible (right file types, required fields). In development, this is what's used. The vehicle gets verified automatically without any human or external service.

**DigiLocker mode** (`VERIFICATION_MODE=digilocker`):
DigiLocker is the Indian Government's digital document vault. Every Indian citizen can store their official documents there (RC, DL, Aadhaar, etc.).

```
1. User uploads docs and is redirected to DigiLocker's website
          ↓
2. User logs into DigiLocker with their Aadhaar (Government ID)
   and approves sharing their vehicle documents with Sampark
          ↓
3. DigiLocker sends Sampark the official document data
          ↓
4. Sampark cross-checks:
   Does the plate number match what the user submitted?
   Do the names match?
   Is the DL valid and not expired?
          ↓
5a. Match → vehicle verified automatically, no human involved
5b. Mismatch → verification failed, user told why, can re-upload and try again
```

There is **no admin review step** in the normal flow. DigiLocker's government data is trusted directly. If verification fails, the user simply re-uploads their documents and tries again as many times as needed.

---

## 11. How the emergency chain works

When someone taps "Emergency" on the scan page, it triggers a **call chain** — a sequence of calls that keep trying until someone answers.

**The chain is a background process.** The user who scanned the QR doesn't need to stay on the page — the chain runs on the server.

```
State machine for one emergency session:

calling_owner
    ↓ (no answer / 30s)
calling_contact_1
    ↓ (no answer / 30s)
calling_contact_2
    ↓ (no answer / 30s)
calling_contact_3
    ↓ (no answer / 30s)
all_failed → SMS sent to everyone simultaneously
```

If **anyone answers** at any step, the chain stops and the state changes to `connected`.

**How does the scanner know what's happening?** The scanner's browser polls (asks repeatedly, every 3 seconds) the `emergency-status` endpoint:

```
Browser: "What stage is emergency session abc123 at?"
Server: "calling_contact_2"
Browser: (3 seconds later) "What stage is it at now?"
Server: "connected"
Browser: "Chain connected! Stopping poll."
```

**The emergency session record** stored in the database tracks the current stage and who it connected to. The caller's phone number is stored encrypted (AES-256) inside the session — never plain text.

**Blocked callers:** Even if a caller is on the blocklist, emergency calls go through. The system notes that the caller was blocked but lets the call happen anyway — because a real emergency shouldn't be blocked. This is flagged in the session record.

**Indian helplines on the scan page:** Regardless of all of this, the Police (100) and Ambulance (108) buttons are always visible on the scan page. These just open the phone dialer — no backend involved at all.

---

## 12. How abuse protection works

**Three layers:**

**Layer 1 — Rate limits (automatic, in memory):**
```
Per caller + per vehicle: max 3 calls per hour
Per vehicle (all callers): max 15 calls per day
Per IP address + per vehicle: max 5 calls per hour
```
These limits reset when the server restarts (they're stored in memory, not the database). The IP-based limit is a secondary check — even if someone uses many different phone numbers, their internet address (IP) gives them away.

**Layer 2 — Blocklist (manual, permanent):**
Vehicle owners can block specific callers from their call log page. Blocked callers get a generic "unable to contact" message and no indication that they're blocked (to prevent them from trying workarounds).

Admins can create global blocks (affect all vehicles) or vehicle-specific blocks, with optional expiry dates.

**Layer 3 — Auto-escalation (automatic, counted):**
```
5 abuse reports on one vehicle → vehicle automatically flagged for admin review
3 abuse reports about one caller hash → admin notified, global block considered
```

This runs whenever an abuse report is filed. The server counts reports automatically and escalates without any human needing to monitor.

---

## 13. How files are stored and protected

When users upload RC/DL/plate photos during vehicle registration, the files are saved in the `server/uploads/` folder on the server's disk.

**File validation happens at two levels:**
1. **File type check:** Only JPEG, PNG, and PDF files are accepted
2. **MIME type trust:** The file's actual type (what's really inside it) is checked, not just the filename. Someone can't rename `evil.html` to `evil.jpg` to try to sneak in malicious code — the server detects the real file type.
3. **File size:** Max 5MB per file

**Access protection:**
Uploaded files are not publicly accessible. You can't just type the URL into a browser and download someone's RC document. Every request to `/uploads/` must include a valid login token. This check happens server-side before any file is served.

The exception: the token can come from a URL parameter (`?token=...`) because browser `<img>` tags and PDF links can't set custom headers. So document links include the token in the URL.

**Git protection:**
The `uploads/` folder is in `.gitignore`, meaning uploaded files are never committed to the code repository. Only a placeholder file (`.gitkeep`) is tracked to ensure the folder exists.

---

## 14. How the system protects itself from being overloaded

**Rate limiting** is covered in the abuse section above, but there are additional protections:

**OTP flood protection:**
```
Max 3 OTP requests per 10 minutes per phone number
```
This prevents someone from hammering the OTP endpoint to try to guess codes or flood someone's phone with SMS.

**SMS template lookup protection:**
The `sms-lookup` endpoint (used to find a vehicle by its card code for offline scenarios) is limited to 10 attempts per IP per hour. Without this, someone could write a script to try every possible card code until they find a valid one.

**Webhook protection:**
Exotel webhooks (calls from Exotel to Sampark to report call status) are protected by a secret token. Exotel includes the token in the webhook URL. Sampark checks this token before processing any webhook. Without this, anyone could send fake "call completed" events to manipulate call logs.

---

## 15. How errors are caught before they crash things

Node.js (the platform the server runs on) has a quirk: if an asynchronous operation (like a database query) fails and the failure isn't explicitly handled, the whole server can crash. This is called an "unhandled promise rejection."

Sampark has two defences against this:

**Defence 1 — `wrapRouter`:**
Every route file exports its router wrapped in a `wrapRouter` function. This function wraps every single route handler so that if anything throws an error, it's automatically caught and passed to the global error handler instead of crashing.

```
Without wrapRouter:
  Database query fails → Unhandled rejection → Server might crash

With wrapRouter:
  Database query fails → Error caught → Sent to global error handler → Clean 500 response
```

**Defence 2 — Global error handler:**
A special 4-argument function registered at the bottom of the server handles all errors that bubble up. It knows how to respond appropriately to different error types:

```
Invalid MongoDB ID format (e.g. someone guessing URLs)  →  400 response
Duplicate database entry (e.g. same plate twice)         →  409 response
Invalid file type in upload                              →  400 response
Everything else                                          →  500 response + log
```

Without this, an invalid ObjectId in a URL (e.g. `/api/v1/vehicles/notanid`) would crash the entire server. With it, the server returns a clean error message and keeps running.

---

## 16. How vehicle transfer works

Transferring a vehicle from one owner to another:

```
Current owner initiates transfer
          ↓
Server creates a transfer token (random 48 hex characters)
and sets it to expire in 48 hours
          ↓
Token is stored on the vehicle record in the database
          ↓
Current owner shares this token with new owner
(out of band — WhatsApp, text, email, whatever)
          ↓
New owner goes to the "Claim Vehicle" page and enters the token
          ↓
Server finds the vehicle with this token, checks it hasn't expired
          ↓
  Transfer accepted:
  - Old vehicle record: deactivated_at set, deactivation_reason = 'transferred'
  - Old vehicle's plate becomes available for re-registration
  - New owner starts fresh: uploads docs, verifies via DigiLocker, pays ₹499
```

**Why does the plate become available?** The uniqueness rule in the database says: "no two active vehicles can have the same plate." Active means `deactivated_at` is empty. Once the old vehicle gets a `deactivated_at` date, it's excluded from the uniqueness check, and the plate can be registered fresh.

**If nobody claims within 48 hours:** The transfer just expires. The vehicle stays with the current owner. No automatic changes happen — transfers only complete when someone actively claims them.

---

## 17. What every environment variable does

Environment variables are like configuration settings that live outside the code. They go in the `server/.env` file. Never commit this file to Git.

```env
# ── Core server settings ────────────────────────────────────────

PORT=5000
# Which port the server listens on. 5000 is the default.

NODE_ENV=development
# Changes how the server behaves. 'development' = more logging, dev shortcuts.
# 'production' = stricter, no shortcuts, trusts the proxy for real IP addresses.

MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/sampark
# The address of your MongoDB Atlas database. Includes username and password.
# This is the most critical secret — whoever has this can read/write all data.

JWT_SECRET=at_least_32_random_characters
# The secret used to stamp digital ID cards (JWTs).
# If this changes, all existing logins are instantly invalidated.
# Must be long and random. Generate with: openssl rand -hex 32

PHONE_ENCRYPT_KEY=exactly_32_characters
# The key used to encrypt phone numbers with AES-256.
# Must be exactly 32 characters. If this changes, all stored phone numbers
# become unreadable. Do not change this after going live.

QR_SECRET=any_random_string
# The secret used to sign QR code URLs. If this changes, all existing
# QR codes stop working and owners need to regenerate.

APP_URL=https://sampark.app
# The base URL of the frontend. Used when generating QR code URLs.

FRONTEND_URL=https://sampark.app
# Where to redirect users after DigiLocker OAuth completes.

# ── Exotel (phone calls and SMS) ───────────────────────────────

EXOTEL_API_KEY=your_key_here
EXOTEL_API_TOKEN=your_token_here
EXOTEL_SID=your_sid_here
# These three together are your Exotel account credentials.

EXOTEL_VIRTUAL_NUMBER=+918XXXXXXXXX
# The masked number that callers see when they receive a call from Sampark.

EXOTEL_WEBHOOK_SECRET=random_string
# A shared secret between Sampark and Exotel. Exotel includes this in every
# webhook call. Sampark checks it before trusting the webhook.

MOCK_CALLS=true
# Set to true in development to skip real Exotel calls.
# Phone ending in 0 = no answer, 1 = busy, anything else = connected.

# ── PayU (payments) ─────────────────────────────────────────────

PAYU_MERCHANT_KEY=your_key
PAYU_MERCHANT_SALT=your_salt
# Your PayU account credentials. The salt is used to sign payment requests.

PAYU_ENV=test
# 'test' = PayU's sandbox (fake payments). 'prod' = real payments.
# Do not set to 'prod' without a real PayU merchant account.

PAYU_PLAN_AMOUNT=499
# The price in rupees. Defaults to 499 if not set.

# ── DigiLocker (document verification) ─────────────────────────

DIGILOCKER_CLIENT_ID=your_id
DIGILOCKER_CLIENT_SECRET=your_secret
# Your DigiLocker API credentials from the DigiLocker developer portal.

DIGILOCKER_REDIRECT_URI=https://yourdomain.com/api/v1/auth/digilocker/callback
# Where DigiLocker sends users back after they approve document sharing.
# Must exactly match what's registered in your DigiLocker developer account.

VERIFICATION_MODE=basic
# 'basic' = auto-verify without DigiLocker (for development/testing)
# 'digilocker' = require DigiLocker verification (for production)
```

```env
# ── client/.env (frontend settings) ───────────────────────────

VITE_API_BASE_URL=http://localhost:5000/api/v1
# Where the frontend sends API requests. In production, this would be
# your server's public URL. In development, the proxy handles this automatically.
```

---

## 18. What every folder and file does

```
sampark/
│
├── server/                      ← The engine. Node.js + Express.
│   │
│   ├── index.js                 ← The main file. Starts the server, connects to
│   │                              the database, and wires all the routes together.
│   │                              Also contains the two Exotel webhook handlers.
│   │
│   ├── .env                     ← Your secret settings. Never commit this.
│   ├── .env.example             ← A template showing what settings are needed.
│   │
│   ├── models/                  ← Database schemas. Defines what data looks like.
│   │   ├── User.js              ← name, phone_hash, phone_encrypted, role, privacy_score
│   │   ├── Vehicle.js           ← plate, status, qr_token, comm_mode, emergency_contacts
│   │   ├── CallLog.js           ← every contact attempt: call/SMS/emergency
│   │   ├── Payment.js           ← PayU transaction records, validity period
│   │   ├── EmergencySession.js  ← live state of an ongoing emergency chain
│   │   ├── Notification.js      ← in-app alerts (bell icon)
│   │   ├── SupportTicket.js     ← help desk: ticket number, messages, status
│   │   ├── AbuseReport.js       ← filed complaints about callers
│   │   ├── Blocklist.js         ← banned callers (vehicle-specific or global)
│   │   ├── ScanLog.js           ← every QR scan event
│   │   └── Order.js             ← physical card orders
│   │
│   ├── routes/                  ← The "doors" into the system. Each file handles
│   │   │                          a group of related requests.
│   │   ├── auth.js              ← /send-otp, /verify-otp, /firebase-verify
│   │   ├── users.js             ← /users/me (get current user)
│   │   ├── settings.js          ← change phone, update name, delete account
│   │   ├── vehicles.js          ← register, list, update, emergency contacts
│   │   ├── vehicleTransfer.js   ← initiate/claim/cancel vehicle transfers
│   │   ├── public.js            ← QR scan, call, SMS, emergency (no login needed)
│   │   ├── payments.js          ← PayU order creation and verification
│   │   ├── digilockerAuth.js    ← DigiLocker OAuth flow
│   │   ├── callLogs.js          ← view call history, file abuse reports
│   │   ├── notifications.js     ← list and mark-read notifications
│   │   ├── support.js           ← FAQ, create/reply to support tickets
│   │   ├── admin.js             ← admin-only: analytics, abuse, blocklist, vehicles
│   │   └── orders.js            ← physical card orders
│   │
│   ├── middleware/              ← Code that runs before a request reaches a route.
│   │   ├── auth.js              ← Checks the JWT. Runs before any protected route.
│   │   ├── adminAuth.js         ← Extra check: is this user an admin?
│   │   ├── upload.js            ← Handles file uploads. Validates type and size.
│   │   └── asyncHandler.js      ← Catches async errors. Applied to all routes.
│   │
│   ├── services/                ← External integrations and complex logic.
│   │   ├── exotel.js            ← Calls the Exotel API for masked calls and SMS.
│   │   ├── notification.js      ← Creates notification records in the database.
│   │   └── verification/        ← Document verification logic.
│   │       ├── index.js         ← Decides which verifier to use (basic or digilocker)
│   │       ├── basic.js         ← Simple checks for dev mode
│   │       └── digilocker.js    ← Full DigiLocker OAuth + document matching
│   │
│   └── utils/                   ← Small helper tools used across the codebase.
│       ├── encrypt.js           ← AES-256 encrypt/decrypt + SHA-256 hash for phones
│       ├── otp.js               ← Generate, store, and verify OTPs with rate limits
│       ├── qr.js                ← Generate and verify HMAC-signed QR URLs
│       ├── rateLimit.js         ← In-memory rate limiters (calls, SMS, lookups)
│       ├── callerProfile.js     ← Look up a caller's history and blocklist status
│       ├── expiryChecker.js     ← Checks if QRs are expiring soon, sends alerts
│       └── privacyScore.js      ← Calculates the owner's privacy score (0-100)
│
├── client/                      ← The website. React + Vite.
│   └── src/
│       │
│       ├── App.jsx              ← The router. Maps URLs to pages.
│       │                          Also defines the loading spinner component.
│       │
│       ├── pages/               ← One file per page the user can visit.
│       │   ├── Landing.jsx      ← The public home page with GSAP animations.
│       │   ├── Login.jsx        ← Phone number + OTP two-step login.
│       │   ├── ProfileSetup.jsx ← Name entry for first-time users.
│       │   ├── Dashboard.jsx    ← Your vehicles, QR codes, scan analytics.
│       │   ├── RegisterVehicle.jsx ← 3-step form: plate → docs → review.
│       │   ├── PublicScan.jsx   ← The page that opens when a QR is scanned.
│       │   │                      No login required. Handles call/SMS/emergency.
│       │   ├── Help.jsx         ← FAQ search + support ticket creation.
│       │   ├── MyTickets.jsx    ← List of your support tickets.
│       │   ├── TicketDetail.jsx ← Full conversation thread for a ticket.
│       │   └── admin/           ← Admin-only pages (require admin role).
│       │       ├── Dashboard.jsx   ← Overview with key stats.
│       │       ├── Verifications.jsx ← Vehicles flagged for manual review.
│       │       ├── AbuseReports.jsx  ← Filed complaints.
│       │       ├── Blocklist.jsx     ← Manage banned callers.
│       │       ├── Support.jsx       ← Help desk ticket queue.
│       │       ├── SupportDetail.jsx ← Individual ticket conversation.
│       │       └── ...              ← Other admin views.
│       │
│       ├── components/          ← Reusable pieces used across multiple pages.
│       │   └── HelpButton.jsx   ← The floating "?" button. Hidden on public pages.
│       │
│       ├── layouts/             ← Page wrappers with shared navigation.
│       │   └── AdminLayout.jsx  ← Sidebar navigation for all admin pages.
│       │
│       └── api/
│           └── axios.js         ← The configured HTTP client. Auto-attaches JWT,
│                                   handles 401 by logging out, and exports an
│                                   uploadsUrl() helper for auth-gated file links.
│
├── README.md                    ← Public-facing overview. Non-technical.
└── DOCUMENTATION.md             ← This file. Technical deep-dive.
```

---

## 19. How everything connects — the full map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   BROWSER (React app on port 5173)                                      │
│                                                                         │
│   Login.jsx  →  axios.js  →  POST /api/v1/auth/verify-otp              │
│                                                                         │
│   Dashboard.jsx  →  GET /api/v1/vehicles                                │
│                      GET /api/v1/users/me  (triggers expiry check)      │
│                                                                         │
│   PublicScan.jsx  →  GET /api/v1/v/:id?sig=  (no auth)                 │
│                       POST /api/v1/v/:id/call  (no auth)               │
│                       POST /api/v1/v/:id/sms   (no auth)               │
│                       POST /api/v1/v/:id/emergency  (no auth)          │
│                                                                         │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │ HTTP over localhost (dev) or HTTPS (prod)
                          ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   SERVER (Express app on port 5000)                                     │
│                                                                         │
│   index.js                                                              │
│     ↳ loads all routes                                                  │
│     ↳ connects to MongoDB                                               │
│     ↳ registers global error handler                                    │
│                                                                         │
│   middleware/auth.js                                                    │
│     ↳ validates JWT on every protected route                            │
│     ↳ checks user exists and token not invalidated                      │
│                                                                         │
│   routes/public.js                                                      │
│     ↳ no auth required                                                  │
│     ↳ calls services/exotel.js for masked calls                        │
│     ↳ reads utils/rateLimit.js before allowing calls                   │
│     ↳ reads utils/callerProfile.js to check blocklist                  │
│     ↳ writes to models/CallLog.js after each contact                   │
│                                                                         │
│   routes/vehicles.js                                                    │
│     ↳ calls services/verification/index.js on new vehicle              │
│     ↳ that calls services/verification/digilocker.js (if prod)         │
│                                                                         │
│   routes/payments.js                                                    │
│     ↳ generates PayU hash for payment initiation                       │
│     ↳ verifies PayU hash on payment result                             │
│     ↳ generates QR via utils/qr.js on success                         │
│                                                                         │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │
              ┌───────────┼──────────────────────────────┐
              ↓           ↓                              ↓
┌─────────────────┐ ┌──────────────┐         ┌──────────────────┐
│  MongoDB Atlas  │ │   Exotel     │         │    PayU          │
│  (Mumbai)       │ │  (Telecom)   │         │  (Payments)      │
│                 │ │              │         │                  │
│  All permanent  │ │  Makes real  │         │  Processes       │
│  data storage   │ │  phone calls │         │  UPI / cards     │
│                 │ │  Sends SMS   │         │                  │
└─────────────────┘ └──────┬───────┘         └──────────────────┘
                           │ Webhook (Exotel calls us back)
                           ↓
                    index.js webhook handlers
                    ↳ Update CallLog status
                    ↳ Trigger missed call notification
```

---

## 20. Running it yourself — the complete guide

### What you need on your computer

1. **Node.js 18 or newer** — Download from [nodejs.org](https://nodejs.org). After installing, open a terminal and type `node --version`. You should see something like `v20.x.x`.

2. **Git** — For downloading the code. Download from [git-scm.com](https://git-scm.com).

3. **A MongoDB Atlas account** (free) — Go to [mongodb.com/atlas](https://www.mongodb.com/atlas). Sign up, create a free cluster, choose the Mumbai (ap-south-1) region. Then:
   - Create a database user with a password
   - Add your IP address to the allowlist (or use `0.0.0.0/0` for dev)
   - Copy the connection string — it looks like `mongodb+srv://user:pass@cluster.../sampark`

4. **Exotel account** (optional for dev) — Skip this for development. Just set `MOCK_CALLS=true`.

5. **PayU test account** (optional for dev) — You can use the test credentials from PayU's documentation.

### Step 1 — Get the code

```bash
git clone https://github.com/yourusername/sampark.git
cd sampark
```

### Step 2 — Set up the backend

```bash
cd server
npm install
```

Now create your `.env` file:

```bash
cp .env.example .env
```

Open `.env` in any text editor and fill in at minimum:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://youruser:yourpassword@yourcluster.mongodb.net/sampark
JWT_SECRET=generate_a_random_32_char_string_here
PHONE_ENCRYPT_KEY=generate_another_random_32_char_string
QR_SECRET=any_random_string_for_qr_signing
APP_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173
MOCK_CALLS=true
VERIFICATION_MODE=basic
PAYU_MERCHANT_KEY=test_key
PAYU_MERCHANT_SALT=test_salt
PAYU_ENV=test
PAYU_PLAN_AMOUNT=499
```

To generate random strings, run in your terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex').slice(0,32))"
```

Start the backend:
```bash
node index.js
```

You should see:
```
MongoDB connected
Server running on http://localhost:5000
```

### Step 3 — Set up the frontend

Open a new terminal window:

```bash
cd client
npm install
```

Create the frontend env file:

```bash
cp .env.example .env
```

The default `.env` should work as-is for development (it points to `localhost:5000`).

Start the frontend:

```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### Step 4 — Open the app

Go to `http://localhost:5173` in your browser.

- Register with any 10-digit number (doesn't need to be real in dev mode)
- The OTP will appear in the server's terminal logs
- Register a vehicle with plate number format like `MH01AB1234`
- Upload any 3 image/PDF files (they don't need to be real documents in basic mode)
- The vehicle will auto-verify (basic mode)
- Use test PayU credentials to simulate payment

### Step 5 — Create an admin account

In the database, find your user document and set `role: "admin"`. Using MongoDB Atlas's web interface, go to Browse Collections → users → find your document → edit → change `role` from `"user"` to `"admin"` → save.

Then log out and back in. You'll see an Admin link in the navigation.

### Common problems

**"PHONE_ENCRYPT_KEY env var is not set"**
Your `.env` file is missing this variable, or the server can't find the `.env` file. Make sure you're running `node index.js` from inside the `server/` folder.

**MongoDB connection errors**
Check your MONGO_URI. Common issues:
- Wrong username or password
- Your IP address isn't in the Atlas allowlist
- The database name at the end of the URI is wrong (should be `/sampark`)

**Port already in use**
Something else is running on port 5000 or 5173. Either stop that thing, or change the PORT in `.env`.

**Frontend shows blank page / API errors**
Make sure the backend is running. The frontend needs the backend to load any data.

---

<div align="center">

*This documentation covers Sampark as of March 2026.*
*For questions, open a support ticket from within the app, or file a GitHub issue.*

</div>
