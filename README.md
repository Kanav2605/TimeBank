# ⏳ TimeBank — Trade Time Instead of Money

> **A decentralized peer-to-peer time-credit economy platform for students.**  
> *"Help someone for 30 minutes → Earn 30 credits → Spend credits → Get 30 minutes of help from someone else. No money involved."*

---

## 🌟 The Problem & The Solution

Students have valuable skills across engineering, design, languages, and academics, but don't always want to pay money for tutoring.

**Traditional Marketplaces**: Saturated with fiat fees, commissions, and uneven affordability.  
**TimeBank**: Establishes a true **Time-Credit Economy** where time is the universal currency of learning:
- **1 minute given = 1 time credit earned**
- **1 minute received = 1 time credit spent**
- **Aryan Example**:
  - Aryan starts with **+60 credits**.
  - **Helps**: Java debugging (30 min) & PPT pitch design (30 min) → Earns +60 credits.
  - **Uses**: English conversational speaking practice (30 min) → Spends 30 credits.
  - **Result**: +90 credits in available balance. Zero fiat money exchanged.

---

## 🏗️ Technical Depth & Architecture

TimeBank is engineered as a robust time-based exchange platform with 6 core subsystems:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          TIMEBANK PLATFORM                             │
├─────────────────────┬───────────────────────┬──────────────────────────┤
│ 1. Transaction      │ 2. Matching Engine    │ 3. Availability Calendar │
│    Ledger (SHA-256) │    & Circular Trades  │    & Slot Scheduling     │
├─────────────────────┼───────────────────────┼──────────────────────────┤
│ 4. Reputation &     │ 5. Window-Based       │ 6. Dispute Mediation     │
│    Reliability (0%) │    Cancellation Engine│    & Escrow Adjudication │
└─────────────────────┴───────────────────────┴──────────────────────────┘
```

### 1. Cryptographic Transaction Ledger
- **Double-Entry Accounting**: Maintains strict debit/credit invariants across all user accounts and system escrow balances.
- **SHA-256 Hash Chaining**: Every transaction is an immutable block linked to the previous block hash starting from the Genesis block (`0000...`).
- **Tamper-Evident Auditing**: Built-in `verifyChainIntegrity()` mathematically validates every block in the ledger chain on demand.
- **Atomic Escrow Locking**: When booking a session, time credits are locked in escrow to prevent double-spending. Credits are released to the helper only upon session completion and mutual sign-off.

### 2. Algorithmic Matching Engine & Circular Trades
- **Direct Bilateral Barter**: Detects 1:1 mutual needs (e.g. Aryan offers Java & needs English; Priya offers English & needs Java → 95% match).
- **Multi-Factor Compatibility Scoring**:
  - Skill exactness & category alignment (Tech, Design, Languages, Academics, Career)
  - Schedule availability overlap across recurring weekday slots
  - Helper reliability score & 5-star rating
- **Multi-Way Circular Trade Detector**: Identifies 3-way time loops ($A \rightarrow B \rightarrow C \rightarrow A$), showing that time credits eliminate the classic "coincidence of wants" barter problem.

### 3. Availability & Conflict Prevention
- Recurring weekly availability schedules (e.g. Mondays 14:00–18:00).
- Standard session increments (15, 30, 45, 60 minutes).
- Real-time conflict checks to prevent overlapping active or pending sessions.

### 4. Reputation & Reliability Metrics
- **Reliability Score (0–100%)**: Dynamically computed from session attendance, completion rate, on-time arrivals, and dispute history.
- **Multi-dimensional Reviews**: Punctuality, helpfulness, and domain competence ratings.
- **Skill Endorsement Badges**: Peer endorsements for demonstrated expertise.

### 5. Window-Based Cancellation Policy
- **Early Cancellation (> 2 hours prior)**: 100% refund of escrowed credits back to requester. Zero penalty.
- **Late Cancellation (< 2 hours prior)**: 50% courtesy fee credited to the helper to respect their reserved calendar slot. Remaining 50% returned to requester.
- **Helper Flake Penalty**: If a tutor cancels, the learner receives 100% refund immediately, and the tutor receives a 5% reliability score deduction.

### 6. Dispute Resolution & Mediation System
- Formal dispute filing within 24 hours of session end time (e.g. *Technical Failure*, *No-Show*, *Incomplete Time*).
- Automatic escrow freezing while disputes are under investigation.
- Evidence submission (duration proof, chat logs, meeting notes).
- Mediation portal with 3 settlement paths:
  1. **Full Refund (100% to Learner)**
  2. **Fair Split (50% Refund / 50% Payout)**
  3. **Release (100% Payout to Helper)**

### 7. Interactive Virtual Peer Room
- Built-in live countdown timer (e.g. 30:00).
- Shared collaborative markdown scratchpad & code editor.
- Interactive topic checklist for tracking session goals.
- Mutual sign-off button that triggers instant cryptographic ledger payout.

---

## 👥 Pre-Seeded Campus Community

TimeBank includes a pre-seeded student ecosystem matching the problem description:

| Student | Balance | Offers | Needs | Reliability |
| :--- | :--- | :--- | :--- | :--- |
| **Aryan Sharma** | **+60 credits** | Java Debugging, PPT Design | English Speaking Practice | 98% (4.9 ★) |
| **Priya Patel** | **+45 credits** | English Speaking, Resume Review | Java Debugging | 100% (5.0 ★) |
| **Marcus Chen** | **+30 credits** | Python & Machine Learning | PPT Design | 94% (4.8 ★) |
| **Elena Rostova** | **+90 credits** | UI/UX & Figma Prototyping | Calculus & Math | 97% (4.9 ★) |
| **Kenji Takahashi** | **+40 credits** | Japanese Language, Algorithms | Web Development & React | 96% (4.9 ★) |
| **Campus Mediator** | Admin | Ledger auditing, dispute adjudication | — | 100% |

*Switch between students with 1 click in the top navigation bar!*

---

## 🚀 Quickstart & Running Locally

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/Kanav2605/TimeBank.git
cd TimeBank

# Install dependencies (root + client)
npm install
npm --prefix client install
```

### 2. Build the Frontend
```bash
npm run build
```

### 3. Start the Server
```bash
npm start
```
The full application will start at:
👉 **`http://localhost:5000`**

*(Or run concurrently in development mode via `npm run dev` with Vite HMR on `http://localhost:5173`).*

---

## 🧪 Automated Test Suite

TimeBank includes comprehensive automated test suites covering all cryptographic, ledger, matching, cancellation, and dispute operations:

```bash
npx tsx --test tests/ledger.test.ts tests/matching.test.ts tests/cancellation_and_disputes.test.ts tests/integration.test.ts
```

### Verified Test Cases:
- ✔ Initializes genesis block with valid SHA-256 hash chain
- ✔ Mints welcome starter credits and records double-entry transactions
- ✔ Locks escrow and rejects overdrafts
- ✔ Releases escrow to helper on mutual sign-off
- ✔ Detects tampering in cryptographic hash chain
- ✔ Computes compatibility score for direct 1:1 bilateral barter
- ✔ Detects 3-way circular time-trade loops ($A \rightarrow B \rightarrow C \rightarrow A$)
- ✔ Early cancellation (>2h) gives 100% refund with 0 penalty
- ✔ Late cancellation (<2h) transfers 50% courtesy fee to helper
- ✔ Helper cancellation gives learner 100% refund with helper reliability deduction
- ✔ Dispute lifecycle and mediation settlement

---

## 📄 License
MIT License. Created for the TimeBank student peer-to-peer time-credit economy.
