const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fdc38y3.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    // Database & Collection
    const habitCollection = client.db("habitDB").collection("habits");

    // CREATE — Add new habit
    app.post("/habits", async (req, res) => {
      const habit = req.body;
      habit.createdAt = new Date();

      try {
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

    // READ — Get only public habits (for home page)
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
        const result = await habitCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedHabit }
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

    // PATCH — Mark Habit as Complete (push today's date)
    app.patch("/habits/:id/complete", async (req, res) => {
      const id = req.params.id;
      const today = new Date().toISOString().split("T")[0]; // e.g. "2025-11-10"

      try {
        const habit = await habitCollection.findOne({ _id: new ObjectId(id) });

        if (!habit) {
          return res
            .status(404)
            .send({ success: false, message: "Habit not found" });
        }

        //Check if already completed today
        const alreadyCompleted = habit.completionHistory?.includes(today);
        if (alreadyCompleted) {
          return res.send({
            success: false,
            message: "You already marked this habit complete today!",
          });
        }

        // Push today's date into completionHistory array
        const result = await habitCollection.updateOne(
          { _id: new ObjectId(id) },
          { $push: { completionHistory: today } }
        );

        res.send({ success: true, message: "Habit marked complete!", result });
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .send({ success: false, message: "Failed to update habit" });
      }
    });

    // Test DB connection
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB and CRUD routes are live!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

//  Root route
app.get("/", (req, res) => {
  res.send("Habit Tracker Server is Running Fine with MongoDB CRUD!");
});

// Start server
app.listen(port, () => {
  console.log(`Habit Tracker Server running on port: ${port}`);
});
