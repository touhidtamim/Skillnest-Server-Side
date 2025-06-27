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

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vp1yd11.mongodb.net/?retryWrites=true&w=majority&appName=SkillNest`;

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
    const db = client.db("skillnest");
    const tasksCollection = db.collection("tasks");
    const freelancersCollection = db.collection("freelancers");
    const usersCollection = db.collection("users");
    const bidsCollection = db.collection("bids");

    // ========== USER ROUTES ==========
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email });
      res.send(user);
    });

    // ========== TASK ROUTES ==========
    app.post("/tasks", async (req, res) => {
      const task = req.body;
      const result = await tasksCollection.insertOne({
        ...task,
        status: "open",
        bidsCount: 0,
        createdAt: new Date(),
      });
      res.send(result);
    });

    app.get("/tasks", async (req, res) => {
      const tasks = await tasksCollection.find().toArray();
      res.send(tasks);
    });

    app.get("/tasks/:id", async (req, res) => {
      const id = req.params.id;
      const task = await tasksCollection.findOne({ _id: new ObjectId(id) });
      if (!task) return res.status(404).json({ error: "Task not found" });
      res.send(task);
    });

    // Rewritten /my-tasks routes without optional param
    app.get("/my-tasks", async (req, res) => {
      const email = req.query.email;
      if (!email) return res.status(400).json({ error: "Email is required" });

      try {
        const tasks = await tasksCollection
          .find({ $or: [{ "client.email": email }, { email: email }] })
          .toArray();
        res.send(tasks);
      } catch (err) {
        res.status(500).json({ error: "Database error" });
      }
    });

    app.get("/my-tasks/:email", async (req, res) => {
      const email = req.params.email;
      if (!email) return res.status(400).json({ error: "Email is required" });

      try {
        const tasks = await tasksCollection
          .find({ $or: [{ "client.email": email }, { email: email }] })
          .toArray();
        res.send(tasks);
      } catch (err) {
        res.status(500).json({ error: "Database error" });
      }
    });

    // ✅ Updated PUT Route for Updating Task
    app.put("/tasks/:id", async (req, res) => {
      const { id } = req.params;
      const updatedTask = req.body;

      try {
        const query = { _id: new ObjectId(id) };

        const updateDoc = {
          $set: {
            title: updatedTask.title,
            category: updatedTask.category,
            description: updatedTask.description,
            deadline: updatedTask.deadline,
            budget: updatedTask.budget,
            image: updatedTask.image,
            skillsRequired: updatedTask.skillsRequired,
            urgency: updatedTask.urgency,
            username: updatedTask.username,
            email: updatedTask.email,
          },
        };

        const result = await tasksCollection.updateOne(query, updateDoc);

        if (result.matchedCount === 0) {
          return res
            .status(404)
            .json({ error: "Task not found or not updated" });
        }

        res.status(200).json({ message: "Task updated successfully" });
      } catch (error) {
        console.error("Error updating task:", error);
        res.status(500).json({ message: "Server error while updating task" });
      }
    });

    app.delete("/tasks/:id", async (req, res) => {
      const id = req.params.id;
      const result = await tasksCollection.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }
      await bidsCollection.deleteMany({ taskId: new ObjectId(id) });
      res.send({ message: "Task deleted successfully" });
    });

    // ========== FEATURED TASKS ROUTE ==========
    app.get("/featured-tasks", async (req, res) => {
      try {
        const featuredTasks = await tasksCollection
          .find({})
          .sort({ createdAt: -1 })
          .limit(8)
          .toArray();
        res.send(featuredTasks);
      } catch (err) {
        console.error("Failed to fetch featured tasks:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // ========== BID ROUTES ==========
    app.post("/tasks/:id/bids", async (req, res) => {
      const taskId = req.params.id;
      const bid = req.body;

      const session = client.startSession();
      try {
        await session.withTransaction(async () => {
          const bidResult = await bidsCollection.insertOne(
            {
              ...bid,
              taskId: new ObjectId(taskId),
              status: "pending",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            { session }
          );

          await tasksCollection.updateOne(
            { _id: new ObjectId(taskId) },
            { $inc: { bidsCount: 1 } },
            { session }
          );

          res.status(201).send({
            message: "Bid submitted successfully",
            bidId: bidResult.insertedId,
          });
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to place bid" });
      } finally {
        await session.endSession();
      }
    });

    app.get("/tasks/:id/bids", async (req, res) => {
      const taskId = req.params.id;
      const bids = await bidsCollection
        .find({ taskId: new ObjectId(taskId) })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(bids);
    });

    app.get("/my-bids/:freelancerId", async (req, res) => {
      const freelancerId = req.params.freelancerId;
      const bids = await bidsCollection.find({ freelancerId }).toArray();
      res.send(bids);
    });

    app.patch("/bids/:id/accept", async (req, res) => {
      const bidId = req.params.id;

      const session = client.startSession();
      try {
        await session.withTransaction(async () => {
          const bid = await bidsCollection.findOne({
            _id: new ObjectId(bidId),
          });
          if (!bid) {
            return res.status(404).json({ error: "Bid not found" });
          }

          await bidsCollection.updateOne(
            { _id: new ObjectId(bidId) },
            { $set: { status: "accepted", updatedAt: new Date() } },
            { session }
          );

          await bidsCollection.updateMany(
            {
              taskId: bid.taskId,
              _id: { $ne: new ObjectId(bidId) },
            },
            { $set: { status: "rejected", updatedAt: new Date() } },
            { session }
          );

          await tasksCollection.updateOne(
            { _id: bid.taskId },
            { $set: { status: "assigned", assignedTo: bid.freelancerId } },
            { session }
          );

          res.send({ message: "Bid accepted successfully" });
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to accept bid" });
      } finally {
        await session.endSession();
      }
    });

    // ========== FREELANCER ROUTES ==========
    app.post("/freelancers", async (req, res) => {
      const freelancer = req.body;
      const result = await freelancersCollection.insertOne(freelancer);
      res.send(result);
    });

    app.get("/freelancers", async (req, res) => {
      const freelancers = await freelancersCollection.find().toArray();
      res.send(freelancers);
    });

    app.get("/freelancers/:id", async (req, res) => {
      const id = req.params.id;
      const freelancer = await freelancersCollection.findOne({
        _id: new ObjectId(id),
      });
      if (!freelancer) {
        return res.status(404).json({ error: "Freelancer not found" });
      }
      res.send(freelancer);
    });

    app.get("/freelancers/by-email/:email", async (req, res) => {
      const email = req.params.email;
      const freelancer = await freelancersCollection.findOne({ email });
      res.send(freelancer);
    });

    // Start server
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } finally {
    // await client.close(); // optional
  }
}

run().catch(console.dir);
