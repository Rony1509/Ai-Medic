# AI Village Medic Express - প্রজেক্ট গাইড

## প্রজেক্ট পরিচিতি

এই প্রজেক্টটি বাংলাদেশের প্রত্যন্ত গ্রামাঞ্চলে স্বাস্থ্যসেবা প্রদানের জন্য একটি সম্পূর্ণ ওয়েব অ্যাপ্লিকেশন। এখানে Rural Medical Worker (RMW), Medical Expert, Health Authority এবং Admin বিভিন্ন ভূমিকায় কাজ করতে পারেন।

---

## প্রজেক্ট চালানোর ধাপসমূহ

### ধাপ ১: প্রজেক্ট ক্লোন করা
```bash
git clone <repository-url>
cd AI-Village-Medic-Express
```

### ধাপ ২: Backend সেটআপ

```bash
cd backend
npm install
```

`.env` ফাইল তৈরি করুন:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/ai-village-medic
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

Backend চালান:
```bash
npm run dev
```

### ধাপ ৩: Frontend সেটআপ

```bash
cd frontend
npm install
```

Frontend চালান:
```bash
npm run dev
```

### ধাপ ৪: Seed Data (ঐচ্ছিক)

Sample users তৈরি করতে:

```bash
cd backend
node src/seed.js
```

এটি নিম্নলিখিত users তৈরি করবে:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@gmail.com | admin123 |
| RMW | rmw@gmail.com | rmw123 |
| Medical Expert | expert@gmail.com | expert123 |
| Health Authority | ha@gmail.com | ha123 |

---

## ব্যবহারকারী লগইন এবং ফিচারসমূহ

### ১. Admin (অ্যাডমিন)

**Seed script চালানোর পরে লগইন:**
- Email: `admin@gmail.com`
- Password: `admin123`

**ফিচারসমূহ:**

| ইনপুট | আউটপুট |
|-------|--------|
| Dashboard Open | Stats cards দেখা যাবে: Total Users, Total Patients, Total Consultations, Pending Approvals |
| Pending Approvals ট্যাব | Pending users এর তালিকা (Name, Email, Role, Date) |
| Approve বাটন | User approved হবে |
| Reject বাটন | User delete হবে |
| All Users ট্যাব | সব approved users দেখা যাবে |

**API Endpoints:**
- `GET /api/admin/stats` - সিস্টেম স্ট্যাটস
- `GET /api/admin/users` - সব users
- `PUT /api/admin/users/:id/approve` - User approve
- `DELETE /api/admin/users/:id` - User reject/delete

---

### ২. Rural Medical Worker (RMW)

**রেজিস্ট্রেশন:**
- Email: gmail.com বা health.gov.bd domain থেকে
- Role: rural-medical-worker সিলেক্ট

**লগইন:**
- Email এবং Password দিয়ে লগইন

**ফিচারসমূহ:**

| ইনপুট | আউটপুট |
|-------|--------|
| Register Patient বাটন | Patient registration form খুলবে |
| Patient তথ্য (Name, Age, Gender, Contact, ID Type, ID Number) | Patient registered, Patient ID ও Password দেখাবে |
| Select Patient + Symptoms + Vitals | Consultation created, AI risk assessment দেখাবে |
| Patients ট্যাব | আপনার registered patients এর তালিকা |

**API Endpoints:**
- `GET /api/patients` - আপনার patients
- `POST /api/auth/patient/register` - নতুন patient
- `GET /api/consultations/my-consultations` - আপনার consultations
- `POST /api/consultations` - নতুন consultation

---

### ৩. Medical Expert

**রেজিস্ট্রেশন:**
- Email: gmail.com বা health.gov.bd domain থেকে
- Role: medical-expert সিলেক্ট

**লগইন:**
- Email এবং Password দিয়ে লগইন

**ফিচারসমূহ:**

| ইনপুট | আউটপুট |
|-------|--------|
| Pending Reviews ট্যাব | Pending consultations এর তালিকা |
| Review বাটন | Review modal খুলবে |
| Patient Details + Symptoms + Vitals + AI Recommendation | দেখা যাবে |
| Expert Review (textarea) | লিখুন |
| Updated Risk Level (dropdown) | Low/Medium/High সিলেক্ট |
| Medications + Follow-up Instructions | লিখুন |
| Submit | Consultation reviewed, Patient এর medications add হবে |
| Reviewed Cases ট্যাব | সব reviewed consultations |

**API Endpoints:**
- `GET /api/consultations/pending` - pending consultations
- `PUT /api/consultations/:id` - consultation review

---

### ৪. Patient

**রেজিস্ট্রেশন:**
- RMW এর মাধ্যমে register হবে
- Patient ID ও Password পাবেন

**লগইন:**
- Patient ID এবং Password দিয়ে লগইন

**ফিচারসমূহ:**

| ইনপুট | আউটপুট |
|-------|--------|
| Dashboard Open | Personal Details, Health Status, Medications, Follow-up Instructions |
| Health Status | Latest consultation এর risk level (High/Medium/Low) |
| Recent Consultations | সব consultations এর তালিকা |

**API Endpoints:**
- `GET /api/consultations/patient/:patientId` - patient এর consultations

---

### ৫. Health Authority

**রেজিস্ট্রেশন:**
- Email: gmail.com বা health.gov.bd domain থেকে
- Role: health-authority সিলেক্ট

**লগইন:**
- Email এবং Password দিয়ে লগইন

**ফিচারসমূহ:**

| ইনপুট | আউটপুট |
|-------|--------|
| Dashboard Open | Overview Stats cards |
| Total Patients | সব patient সংখ্যা |
| Total Consultations | সব consultation সংখ্যা |
| High/Medium/Low Risk Cases | risk অনুযায়ী সংখ্যা |
| Pending Reviews | review pending সংখ্যা |
| Risk Distribution | colored bars সহ percentage |
| Case Trends | last 7 days consultation count |
| Common Symptoms | top symptoms তালিকা |

**API Endpoints:**
- `GET /api/analytics/overview` - overview stats
- `GET /api/analytics/trends` - case trends
- `GET /api/analytics/diseases` - disease/symptom stats

---

## সমস্যা সমাধান

### কোনো Error দেখা গেলে:
1. Backend চালু আছে কিনা দেখুন (port 5000)
2. MongoDB চালু আছে কিনা দেখুন
3. `.env` ফাইল সঠিক আছে কিনা চেক করুন
4. `npm install` আবার করুন

### CORS Error হলে:
- Frontend এর port allowed origins এ add করুন

---

## টেকনিক্যাল স্ট্যাক

- **Backend:** Node.js, Express, MongoDB, JWT
- **Frontend:** React, Tailwind CSS, Axios
- **Authentication:** JWT Token based

---

## License

MIT License

akhane kibab input dibo and kon step er por ki kaj korbo,ami kisu bujtasi na