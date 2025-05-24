require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// ===== Middleware =====
app.use(cors());
app.use(express.json());

// ===== Root Route =====
app.get('/', (req, res) => {
  res.send('SkillNest Server is Running');
});

// ===== MongoDB Connection URI =====
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vp1yd11.mongodb.net/?retryWrites=true&w=majority&appName=SkillNest`;

// ===== MongoDB Client Setup =====
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    console.log("✅ MongoDB Connected");

    const db = client.db("skillnest");
    const tasksCollection = db.collection("tasks");

    // ===== Create Task =====
    app.post('/tasks', async (req, res) => {
      try {
        const task = req.body;
        const result = await tasksCollection.insertOne(task);
        res.send(result);
      } catch (error) {
        console.error('❌ Error adding task:', error);
        res.status(500).json({ error: 'Failed to add task' });
      }
    });

    // ===== Get All Tasks =====
    app.get('/tasks', async (req, res) => {
      try {
        const tasks = await tasksCollection.find().toArray();
        res.send(tasks);
      } catch (error) {
        console.error('❌ Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
      }
    });

    // ===== Get Single Task by ID =====
    app.get('/tasks/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const task = await tasksCollection.findOne({ _id: new ObjectId(id) });
        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }
        res.send(task);
      } catch (error) {
        console.error('❌ Error fetching task by ID:', error);
        res.status(500).json({ error: 'Failed to fetch task' });
      }
    });

    // ===== Get Tasks by User Email =====
    app.get('/my-tasks', async (req, res) => {
      try {
        const userEmail = req.query.email;
        if (!userEmail) {
          return res.status(400).json({ error: "Email query parameter is required" });
        }
        const userTasks = await tasksCollection.find({ email: userEmail }).toArray();
        res.send(userTasks);
      } catch (error) {
        console.error('❌ Error fetching user tasks:', error);
        res.status(500).json({ error: 'Failed to fetch user tasks' });
      }
    });

    // ===== Update Task by ID =====
    app.put('/tasks/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const updatedTask = req.body;

        const result = await tasksCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedTask }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: "Task not found" });
        }

        res.send({ message: "Task updated successfully" });
      } catch (error) {
        console.error("❌ Error updating task:", error);
        res.status(500).json({ error: "Failed to update task" });
      }
    });

    // ===== Delete Task by ID =====
    app.delete('/tasks/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const result = await tasksCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: 'Task not found' });
        }

        res.json({ message: 'Task deleted successfully', deletedCount: result.deletedCount });
      } catch (error) {
        console.error('❌ Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task' });
      }
    });

    // ===== Start Server =====
    app.listen(port, () => {
      console.log(`🚀 Server running at http://localhost:${port}`);
    });

  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

run().catch(console.dir);
