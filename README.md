# Habit Tracker Server

A **Node.js + Express** backend server with **MongoDB** integration for managing daily habits.  
This server supports full **CRUD operations**, **public habit sharing**, and **habit completion tracking**.

---

## GitHub Client Repository (Client)

https://github.com/SMDpHeroB12/B12A10-C09-Habit-Tracker-Client

---

## 🚀 Features

- ✅ **Create** new habits
- 📖 **Read** habits by user or view all public habits
- ✏️ **Update** existing habits
- 🗑️ **Delete** habits
- 🔁 **Mark habits as complete** (tracks daily completion)
- 🌐 **Public/Private habit visibility**
- 📅 **Automatic timestamps** (`createdAt`)

---

## 🧩 Tech Stack

| Technology        | Purpose                       |
| ----------------- | ----------------------------- |
| **Node.js**       | Runtime environment           |
| **Express.js**    | Server framework              |
| **MongoDB Atlas** | Cloud database                |
| **dotenv**        | Secure environment variables  |
| **CORS**          | Cross-origin request handling |

---

## 📡 API Endpoints

| Method     | Endpoint               | Description                            |
| ---------- | ---------------------- | -------------------------------------- |
| **POST**   | `/habits`              | Add a new habit                        |
| **GET**    | `/habits`              | Get all habits or filter by user email |
| **GET**    | `/habits/public`       | Get all public habits                  |
| **GET**    | `/habits/:id`          | Get single habit by ID                 |
| **PUT**    | `/habits/:id`          | Update an existing habit               |
| **DELETE** | `/habits/:id`          | Delete a habit                         |
| **PATCH**  | `/habits/:id/complete` | Mark a habit as complete               |

---

## 🧩 Deployment

- **Client Side:** Firebase Hosting : [https://habit-tracker-b12a10c09.web.app/](https://habit-tracker-b12a10c09.web.app/)
- **Server Side:** Vercel : [https://habit-tracker-server-iota.vercel.app/](https://habit-tracker-server-iota.vercel.app/)
- **Database:** MongoDB Atlas

---

## 🧑‍💻 Author

**Shekh MD NAYEM YOUSUF**
