require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.send('SkillNest Server is Running');
});

// MongoDB URI from .env
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vp1yd11.mongodb.net/?retryWrites=true&w=majority&appName=SkillNest`;

// MongoDB client
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

    // 🔸 POST: Add a task
    app.post('/tasks', async (req, res) => {
      try {
        const task = req.body;
        const result = await tasksCollection.insertOne(task);
        res.send(result);
      } catch (error) {
        console.error('❌ Failed to add task:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    // 🔸 GET: All tasks
    app.get('/tasks', async (req, res) => {
      try {
        const tasks = await tasksCollection.find().toArray();
        res.send(tasks);
      } catch (error) {
        console.error('❌ Failed to fetch tasks:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    // 🔸 GET: Single task by ID
    app.get('/tasks/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const task = await tasksCollection.findOne({ _id: new ObjectId(id) });
        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }
        res.send(task);
      } catch (error) {
        console.error('❌ Failed to fetch task:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    // Start server
    app.listen(port, () => {
      console.log(`🚀 Server running at http://localhost:${port}`);
    });

  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

run().catch(console.dir);


