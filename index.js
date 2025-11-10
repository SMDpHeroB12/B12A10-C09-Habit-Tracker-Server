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

// Create a MongoClient
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

    //  Database and Collection
    const habitCollection = client.db("habitDB").collection("habits");

    // CREATE — Add a new habit
    app.post("/habits", async (req, res) => {
      const habit = req.body;
      habit.createdAt = new Date();
      const result = await habitCollection.insertOne(habit);
      res.send(result);
    });

    // READ — Get all habits (for Featured Habits etc.)
    app.get("/habits", async (req, res) => {
      const cursor = habitCollection.find().sort({ createdAt: -1 }).limit(6);
      const habits = await cursor.toArray();
      res.send(habits);
    });

    // READ Single Habit by ID
    app.get("/habits/:id", async (req, res) => {
      const id = req.params.id;
      const habit = await habitCollection.findOne({ _id: new ObjectId(id) });
      res.send(habit);
    });

    // UPDATE — Update habit info
    app.put("/habits/:id", async (req, res) => {
      const id = req.params.id;
      const updatedHabit = req.body;
      const result = await habitCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedHabit }
      );
      res.send(result);
    });

    //  DELETE — Delete a habit
    app.delete("/habits/:id", async (req, res) => {
      const id = req.params.id;
      const result = await habitCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB and CRUD routes are live!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("This server is running Fine!!! Nodemon added");
});

app.listen(port, () => {
  console.log(`Habit Tracker Server is Running on port : ${port}`);
});
