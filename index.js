require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send("SkillNest Server is Running");
});

// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vp1yd11.mongodb.net/?retryWrites=true&w=majority&appName=SkillNest`;

// MongoDB client setup
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // DB reference
    const db = client.db("skillnest");
    const tasksCollection = db.collection("tasks");

    // POST: Create new task
    app.post("/tasks", async (req, res) => {
      const task = req.body;
      const result = await tasksCollection.insertOne(task);
      res.send(result);
    });

    // GET: Featured tasks (sorted by deadline, limited)
    app.get("/featured-tasks", async (req, res) => {
      const tasks = await tasksCollection
        .find()
        .sort({ deadline: 1 })
        .limit(6)
        .toArray();
      res.send(tasks);
    });

    // GET: All tasks
    app.get("/tasks", async (req, res) => {
      const tasks = await tasksCollection.find().toArray();
      res.send(tasks);
    });

    // GET: Single task by ID
    app.get("/tasks/:id", async (req, res) => {
      const id = req.params.id;
      const task = await tasksCollection.findOne({ _id: new ObjectId(id) });
      if (!task) return res.status(404).json({ error: "Task not found" });
      res.send(task);
    });

    // GET: Tasks by user email
    app.get("/my-tasks", async (req, res) => {
      const email = req.query.email;
      if (!email)
        return res.status(400).json({ error: "Email query param required" });
      const tasks = await tasksCollection.find({ email }).toArray();
      res.send(tasks);
    });

    // PUT: Update task by ID
    app.put("/tasks/:id", async (req, res) => {
      const id = req.params.id;
      const updatedTask = req.body;
      const result = await tasksCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedTask }
      );
      if (result.matchedCount === 0)
        return res.status(404).json({ error: "Task not found" });
      res.send({ message: "Task updated" });
    });

    // DELETE: Remove task by ID
    app.delete("/tasks/:id", async (req, res) => {
      const id = req.params.id;
      const result = await tasksCollection.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0)
        return res.status(404).json({ error: "Task not found" });
      res.json({ message: "Task deleted" });
    });

    // PATCH: Increment bid count
    app.patch("/tasks/:id/bid", async (req, res) => {
      const id = req.params.id;
      const result = await tasksCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $inc: { bidsCount: 1 } },
        { returnDocument: "after" }
      );
      if (!result.value)
        return res.status(404).json({ error: "Task not found" });
      res.json({ message: "Bid placed", bidsCount: result.value.bidsCount });
    });

    // Start server
    app.listen(port, () => {
      console.log(`Server running on PORT ${port}`);
    });
  } catch (error) {
    console.error("DB connection error:", error);
    process.exit(1);
  }
}

run().catch(console.dir);
