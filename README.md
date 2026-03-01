# AI Village Medic - স্বাস্থ্য সেবা প্রকল্প

## প্রকল্পের সংক্ষিপ্ত বিবরণ

AI Village Medic হলো একটি উদ্ভাবনী স্বাস্থ্য সেবা প্ল্যাটফর্ম যা গ্রামীণ এলাকার মানুষদের জন্য তৈরি করা হয়েছে। এই প্রকল্পের মূল উদ্দেশ্য হলো বাংলাদেশের প্রত্যন্ত গ্রামাঞ্চালে স্বাস্থ্যসেবা পৌঁছে দেওয়া, যেখানে চিকিৎসক সংকট রয়েছে।

---

## 🌟 প্রকল্পের বৈশিষ্ট্যসমূহ

### ১. দুই ধরনের প্রমাণীকরণ সিস্টেম

#### ক) অনুমোদিত কর্মী (Authorized Personnel)
- গ্রামীণ স্বাস্থ্য কর্মী (Rural Medical Worker)
- চিকিৎসা বিশেষজ্ঞ (Medical Expert)
- স্বাস্থ্য কর্তৃপক্ষ (Health Authority)
- প্রশাসক (System Admin)

#### খ) রোগী (Patient)
- গ্রামীণ স্বাস্থ্য কর্মী দ্বারা নিবন্ধিত
- স্বয়ংক্রিয় রোগী আইডি জেনারেশন

### ২. ভূমিকা-ভিত্তিক ড্যাশবোর্ড

| ভূমিকা | কাজ |
|--------|-----|
| রোগী | নিজের স্বাস্থ্য রেকর্ড, চিকিৎসা পরামর্শ, ওষুধ তালিকা দেখা |
| গ্রামীণ স্বাস্থ্য কর্মী | রোগী নিবন্ধন, প্রাথমিক স্বাস্থ্য মূল্যায়ন |
| চিকিৎসা বিশেষজ্ঞ | AI মূল্যায়ন যাচাই ও অনুমোদন |
| স্বাস্থ্য কর্তৃপক্ষ | রোগের প্রবণতা বিশ্লেষণ ও পর্যবেক্ষণ |
| প্রশাসক | ব্যবহারকারী ব্যবস্থাপনা, সিস্টেম পর্যবেক্ষণ |

### ৩. নিরাপত্তা বৈশিষ্ট্য
- 🔒 JWT টোকেন ভিত্তিক প্রমাণীকরণ
- 🔑 bcryptjs দিয়ে পাসওয়ার্ড হ্যাশিং
- 📧 Gmail ও Government (@health.gov.bd) ইমেইল ভ্যালিডেশন
- 👤 ভূমিকা-ভিত্তিক অ্যাক্সেস নিয়ন্ত্রণ

---

## 🏗️ প্রযুক্তি স্ট্যাক

### Frontend
- **React 18** - ইউজার ইন্টারফেস
- **React Router v6** - পেজ রাউটিং
- **Vite** - বিল্ড টুল
- **Tailwind CSS** - স্টাইলিং
- **Axios** - API কল

### Backend
- **Express.js** - ওয়েব ফ্রেমওয়ার্ক
- **Node.js** - রানটাইম
- **MongoDB** - ডাটাবেস
- **Mongoose** - ODM
- **JWT** - টোকেন ভিত্তিক প্রমাণীকরণ
- **bcryptjs** - পাসওয়ার্ড এনক্রিপশন
- **Cors** - ক্রস-অরিজিন রিকোয়েস্ট

---

## 🗄️ MongoDB মডেলস

### ১. User মডেল (`backend/src/models/User.js`)
| ফিল্ড | টাইপ | বিবরণ |
|--------|------|--------|
| email | String | ইমেইল (unique) |
| password | String | হ্যাশড পাসওয়ার্ড |
| fullName | String | পুরো নাম |
| role | String | enum: rural-medical-worker, medical-expert, health-authority, admin |
| isApproved | Boolean | অ্যাডমিন অনুমোদন (default: false) |
| createdAt | Date | তৈরির তারিখ |

### ২. Patient মডেল (`backend/src/models/Patient.js`)
| ফিল্ড | টাইপ | বিবরণ |
|--------|------|--------|
| patientId | String | স্বয়ংক্রিয় (P-XXXXX ফরম্যাট) |
| name | String | রোগীর নাম |
| age | Number | বয়স |
| gender | String | লিঙ্গ |
| contact | String | যোগাযোগ নম্বর |
| identificationId | String | পরিচয়পত্র নম্বর |
| identificationType | String | enum: National ID, Birth Certificate, Passport |
| password | String | হ্যাশড পাসওয়ার্ড |
| registeredBy | ObjectId | User রেফারেন্স |
| consultations | Array | Consultation রেফারেন্স |
| medications | Array | ওষুধ তালিকা |
| followUps | Array | ফলো-আপ তালিকা |
| createdAt | Date | তৈরির তারিখ |

### ৩. Consultation মডেল (`backend/src/models/Consultation.js`)
| ফিল্ড | টাইপ | বিবরণ |
|--------|------|--------|
| consultationId | String | স্বয়ংক্রিয় (C-XXXXXX ফরম্যাট) |
| patientId | ObjectId | Patient রেফারেন্স |
| recordedBy | ObjectId | User রেফারেন্স |
| symptoms | String | লক্ষণ |
| voiceInputText | String | ভয়েস ইনপুট টেক্সট |
| temperature | Number | তাপমাত্রা |
| bloodPressure | Object | সিস্টোলিক/ডায়াস্টোলিক |
| otherVitals | Object | অন্যান্য ভাইটাল সাইন |
| consultationDate | Date | পরামর্শের তারিখ |
| riskLevel | String | enum: Low, Medium, High, Pending |
| aiRecommendation | String | AI সুপারিশ |
| expertReview | String | বিশেষজ্ঞ পর্যালোচনা |
| expertId | ObjectId | বিশেষজ্ঞ User রেফারেন্স |
| status | String | enum: Pending Review, Reviewed, Escalated |
| createdAt | Date | তৈরির তারিখ |

---

## 📁 প্রকল্পের কাঠামো

```
AI/
├── frontend/                 # React Frontend
│   ├── src/
│   │   ├── components/      # পুনঃব্যবহারযোগ্য কম্পোনেন্ট
│   │   ├── pages/           # পেজ কম্পোনেন্ট
│   │   ├── context/         # Auth, গ্লোবাল স্টেট
│   │   ├── utils/           # API ও হেল্পার ফাংশন
│   │   └── styles/          # গ্লোবাল স্টাইল
│   ├── package.json
│   └── vite.config.js
│
└── backend/                  # Express Backend
    ├── src/
    │   ├── controllers/    # বিজনেস লজিক
    │   ├── models/          # ডেটা মডেল
    │   ├── routes/          # API রাউট
    │   ├── middleware/      # Auth middleware
    │   └── utils/           # JWT, পাসওয়ার্ড ইউটিলিটি
    ├── .env
    └── package.json
```

---

## 🚀 কীভাবে চালাবেন

### পূর্বশর্ত
- Node.js (v16 বা উচ্চতর)
- npm

### ধাপ ১: Backend চালানো

```bash
cd backend
npm install
npm run dev
```
Backend চলবে: `http://localhost:5000`

### ধাপ ২: Frontend চালানো

```bash
cd frontend
npm install
npm run dev
```
Frontend চলবে: `http://localhost:3000`

---

## 📡 API এন্ডপয়েন্টস

### Authentication
| মেথড | এন্ডপয়েন্ট | বিবরণ |
|-------|------------|--------|
| POST | `/api/auth/register` | অনুমোদিত কর্মী নিবন্ধন |
| POST | `/api/auth/login` | কর্মী লগইন |
| POST | `/api/auth/patient/register` | রোগী নিবন্ধন |
| POST | `/api/auth/patient/login` | রোগী লগইন |

### Health Check
| মেথড | এন্ডপয়েন্ট | বিবরণ |
|-------|------------|--------|
| GET | `/api/health` | সার্ভার স্বাস্থ্য পরীক্ষা |

### Consultations
| মেথড | এন্ডপয়েন্ট | ভূমিকা | বিবরণ |
|-------|------------|--------|--------|
| POST | `/api/consultations` | rural-medical-worker | রোগীর পরামর্শ তৈরি ও AI রিস্ক অ্যাসেসমেন্ট |
| GET | `/api/consultations/patient/:patientId` | সবাই | রোগীর সব পরামর্শ দেখা |
| GET | `/api/consultations/pending` | medical-expert | অপেক্ষমাণ পরামর্শগুলো দেখা |
| PUT | `/api/consultations/:id` | medical-expert | পরামর্শ পর্যালোচনা ও অনুমোদন |
| GET | `/api/consultations` | admin/medical-expert | সব পরামর্শ |

---

## 🤖 AI Risk Assessment

### ঝুঁকি স্তর নির্ধারণ:

#### 🔴 HIGH RISK (উচ্চ ঝুঁকি):
- তাপমাত্রা > 103°F
- লক্ষণে: chest pain, unconscious, severe bleeding, stroke, heart attack, বুকে ব্যথা, অজ্ঞান

#### 🟡 MEDIUM RISK (মাঝারি ঝুঁকি):
- তাপমাত্রা 100-103°F
- লক্ষণে: fever, vomiting, diarrhea, infection, জ্বর, বমি, ডায়রিয়া

#### 🟢 LOW RISK (স্বাভাবিক):
- অন্যান্য সব ক্ষেত্রে

### AI সুপারিশ:
| ঝুঁকি স্তর | সুপারিশ |
|-----------|---------|
| Low | Rest and home care advised. Stay hydrated. If symptoms worsen, visit health center. |
| Medium | Consult a doctor. Preliminary medication may be required. Follow up in 3 days. |
| High | URGENT: Immediate referral to hospital required. Contact emergency services. |

---

## 💻 ব্যবহারের নিয়ম

### ১. কর্মী নিবন্ধন
```
ইমেইল: doctor@health.gov.bd (অথবা @gmail.com)
পাসওয়ার্ড: secure123
নাম: Dr. Ahmed Khan
ভূমিকা: medical-expert
```

### ২. রোগী নিবন্ধন (কর্মী দ্বারা)
```
নাম: ফাতিমা আহমেদ
বয়স: ৩৫
লিঙ্গ: মহিলা
যোগাযোগ: ০১৭০০০০০০০০
জাতীয় পরিচয়পত্র নম্বর: ১২৩৪৫৬৭৮৯০
```

---

## 🔮 ভবিষ্যৎ উন্নয়ন পরিকল্পনা

1. MongoDB ইন্টিগ্রেশন
2. AI রিস্ক অ্যাসেসমেন্ট ইন্টিগ্রেশন
3. ভয়েস ইনপুট কম্পোনেন্ট
4. বাংলা ভাষা সমর্থন
5. নোটিফিকেশন সিস্টেম
6. ফলো-আপ ম্যানেজমেন্ট

---

## ⚠️ গুরুত্বপূর্ণ তথ্য

- এই প্রকল্পটি বর্তমানে **ডেভেলপমেন্ট মোডে** আছে
- ডাটাবেস হিসেবে **MongoDB Atlas** ব্যবহার করছে
- Mongoose ODM দিয়ে ডাটাবেস কানেকশন পরিচালিত হচ্ছে

---

## 📞 সাপোর্ট

কোনো সমস্যা হলে frontend এবং backend দুটো আলাদা টার্মিনালে চালাতে হবে।

**Frontend:** http://localhost:3000
**Backend:** http://localhost:5000

---

*AI Village Medic - গ্রামীণ স্বাস্থ্য সেবার নতুন দিশা*

