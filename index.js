const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fdc38y3.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// --------- Admin allowlist (simple) ---------
// You can set in Vercel env: ADMIN_EMAILS="a@gmail.com,b@gmail.com"
const ADMIN_EMAILS = String(process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((x) => x.trim().toLowerCase())
  .filter(Boolean);

// fallback: your admin email from requirement (keep here so it works even if env missing)
if (!ADMIN_EMAILS.includes("md.bellal010@gmail.com")) {
  ADMIN_EMAILS.push("md.bellal010@gmail.com");
}

const isAdminEmail = (email) =>
  ADMIN_EMAILS.includes(String(email || "").toLowerCase());

const requireAdmin = (req, res, next) => {
  const adminEmail = req.query.adminEmail || req.headers["x-admin-email"];
  if (!isAdminEmail(adminEmail)) {
    return res
      .status(403)
      .send({ success: false, message: "Forbidden: Admin only" });
  }
  next();
};

// --- helpers ---
const normalizeImages = (habit) => {
  const imagesFromArray = Array.isArray(habit?.images) ? habit.images : [];
  const imagesFromSingle =
    typeof habit?.image === "string" && habit.image.trim()
      ? [habit.image.trim()]
      : [];

  const merged = [...imagesFromArray, ...imagesFromSingle]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);

  const unique = [...new Set(merged)];

  habit.images = unique;
  habit.image = unique[0] || habit.image || "";

  return habit;
};

async function run() {
  try {
    // await client.connect();

    // Database & Collections
    const db = client.db("habitDB");
    const habitCollection = db.collection("habits");
    const userCollection = db.collection("users");

    // ---------------- USERS (Role) ----------------

    // Upsert user after login/register
    // body: { email, name, photoURL }
    app.post("/users", async (req, res) => {
      try {
        const { email, name, photoURL } = req.body || {};
        if (!email) {
          return res
            .status(400)
            .send({ success: false, message: "Email is required" });
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        const existing = await userCollection.findOne({
          email: normalizedEmail,
        });

        // Role rule:
        // - if email is in ADMIN_EMAILS => admin
        // - else => user
        const role = isAdminEmail(normalizedEmail)
          ? "admin"
          : existing?.role || "user";

        const doc = {
          email: normalizedEmail,
          name: name || existing?.name || "",
          photoURL: photoURL || existing?.photoURL || "",
          role,
          updatedAt: new Date(),
          lastLoginAt: new Date(),
          createdAt: existing?.createdAt || new Date(),
        };

        await userCollection.updateOne(
          { email: normalizedEmail },
          { $set: doc },
          { upsert: true },
        );

        res.send({ success: true, role });
      } catch (err) {
        console.error(err);
        res
          .status(500)
          .send({ success: false, message: "Failed to save user" });
      }
    });

    // Get role by email
    app.get("/users/role", async (req, res) => {
      try {
        const email = req.query.email;
        if (!email)
          return res
            .status(400)
            .send({ success: false, message: "Email required" });

        const normalizedEmail = String(email).trim().toLowerCase();

        // allowlist always wins
        if (isAdminEmail(normalizedEmail)) {
          return res.send({ success: true, role: "admin" });
        }

        const user = await userCollection.findOne({ email: normalizedEmail });
        res.send({ success: true, role: user?.role || "user" });
      } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: "Failed to get role" });
      }
    });

    // ---------------- ADMIN ENDPOINTS ----------------

    // Admin stats for dashboard chart/cards
    app.get("/admin/stats", requireAdmin, async (req, res) => {
      try {
        const totalUsers = await userCollection.countDocuments();
        const totalHabits = await habitCollection.countDocuments();
        const publicHabits = await habitCollection.countDocuments({
          isPublic: true,
        });
        const featuredHabits = await habitCollection.countDocuments({
          isFeatured: true,
        });

        // category distribution (for charts)
        const categoryAgg = await habitCollection
          .aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ])
          .toArray();

        res.send({
          success: true,
          stats: {
            totalUsers,
            totalHabits,
            publicHabits,
            featuredHabits,
            categoryAgg,
          },
        });
      } catch (err) {
        console.error(err);
        res
          .status(500)
          .send({ success: false, message: "Failed to load admin stats" });
      }
    });

    // Admin: list users
    app.get("/admin/users", requireAdmin, async (req, res) => {
      try {
        const users = await userCollection
          .find({})
          .sort({ createdAt: -1 })
          .project({ email: 1, name: 1, role: 1, createdAt: 1, lastLoginAt: 1 })
          .toArray();

        res.send({ success: true, users });
      } catch (err) {
        console.error(err);
        res
          .status(500)
          .send({ success: false, message: "Failed to load users" });
      }
    });

    // Admin: list all habits
    app.get("/admin/habits", requireAdmin, async (req, res) => {
      try {
        const habits = await habitCollection
          .find({})
          .sort({ createdAt: -1 })
          .toArray();
        res.send({ success: true, habits });
      } catch (err) {
        console.error(err);
        res
          .status(500)
          .send({ success: false, message: "Failed to load habits" });
      }
    });

    // Admin: delete any habit
    app.delete("/admin/habits/:id", requireAdmin, async (req, res) => {
      try {
        const id = req.params.id;
        const result = await habitCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send({ success: true, result });
      } catch (err) {
        console.error(err);
        res
          .status(500)
          .send({ success: false, message: "Failed to delete habit" });
      }
    });

    // ---------------- HABITS (your existing CRUD) ----------------

    // CREATE — Add new habit
    app.post("/habits", async (req, res) => {
      const habit = req.body;

      try {
        habit.createdAt = new Date();
        normalizeImages(habit);

        if (!Array.isArray(habit.completionHistory))
          habit.completionHistory = [];

        const result = await habitCollection.insertOne(habit);

        if (result.insertedId) {
          res.send({ success: true, insertedId: result.insertedId });
        } else {
          res
            .status(400)
            .send({ success: false, message: "Failed to insert habit" });
        }
      } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: "Server error" });
      }
    });

    // READ — Get all habits (with optional email filter)
    app.get("/habits", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) query = { userEmail: email };

      try {
        const habits = await habitCollection
          .find(query)
          .sort({ createdAt: -1 })
          .toArray();
        res.send({ success: true, habits });
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .send({ success: false, message: "Failed to load habits" });
      }
    });

    // READ — Get only public habits
    app.get("/habits/public", async (req, res) => {
      try {
        const habits = await habitCollection
          .find({ isPublic: true })
          .sort({ createdAt: -1 })
          .toArray();
        res.send({ success: true, habits });
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .send({ success: false, message: "Failed to fetch public habits" });
      }
    });

    // READ — Get single habit by ID
    app.get("/habits/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const habit = await habitCollection.findOne({ _id: new ObjectId(id) });

        if (!habit) {
          return res
            .status(404)
            .send({ success: false, message: "Habit not found" });
        }

        normalizeImages(habit);
        res.send({ success: true, habit });
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .send({ success: false, message: "Failed to fetch habit" });
      }
    });

    // UPDATE — Update habit
    app.put("/habits/:id", async (req, res) => {
      const id = req.params.id;
      const updatedHabit = req.body;

      try {
        normalizeImages(updatedHabit);

        const result = await habitCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedHabit },
        );
        res.send({ success: true, result });
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .send({ success: false, message: "Failed to update habit" });
      }
    });

    // DELETE — Delete habit
    app.delete("/habits/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const result = await habitCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send({ success: true, result });
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .send({ success: false, message: "Failed to delete habit" });
      }
    });

    // PATCH — Mark Habit as Complete
    app.patch("/habits/:id/complete", async (req, res) => {
      const id = req.params.id;
      const today = new Date().toISOString().split("T")[0];

      try {
        const habit = await habitCollection.findOne({ _id: new ObjectId(id) });

        if (!habit) {
          return res
            .status(404)
            .send({ success: false, message: "Habit not found" });
        }

        const alreadyCompleted = habit.completionHistory?.includes(today);
        if (alreadyCompleted) {
          return res.send({
            success: false,
            message: "You already marked this habit complete today!",
          });
        }

        const result = await habitCollection.updateOne(
          { _id: new ObjectId(id) },
          { $push: { completionHistory: today } },
        );

        res.send({ success: true, message: "Habit marked complete!", result });
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .send({ success: false, message: "Failed to update habit" });
      }
    });

    console.log("Connected to MongoDB and routes are live!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

// Root route
app.get("/", (req, res) => {
  res.send("Habit Tracker Server is Running Fine with MongoDB CRUD + Roles!");
});

// Start server
app.listen(port, () => {
  console.log(`Habit Tracker Server running on port: ${port}`);
});
