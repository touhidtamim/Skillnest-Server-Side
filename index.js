require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware Setup

app.use(cors());
app.use(express.json());

//Root Route 
app.get('/', (req, res) => {
  res.send('SkillNest Server is Running');
});

// MongoDB Connection String 
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vp1yd11.mongodb.net/?retryWrites=true&w=majority&appName=SkillNest`;

// Setup MongoDB Client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//  Main Function to run the server and connect to DB
async function run() {
  try {
    await client.connect();
    console.log(" MongoDB Connected");

    // Select database and collection
    const db = client.db("skillnest");
    const tasksCollection = db.collection("tasks");

    
    // Add new task 
    app.post('/tasks', async (req, res) => {
      try {
        const task = req.body;
        const result = await tasksCollection.insertOne(task);
        res.send(result);
      } catch (error) {
        console.log(' Error adding task:', error);
        res.status(500).json({ error: 'Failed to add task' });
      }
    });

    // Get tasks 
    app.get('/tasks', async (req, res) => {
      try {
        const tasks = await tasksCollection.find().toArray();
        res.send(tasks);
      } catch (error) {
        console.log(' Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
      }
    });

    //Get a single task by ID 
    app.get('/tasks/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const task = await tasksCollection.findOne({ _id: new ObjectId(id) });
        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }
        res.send(task);
      } catch (error) {
        console.log(' Error fetching task by ID:', error);
        res.status(500).json({ error: 'Failed to fetch task' });
      }
    });

    //  Get tasks by user email (query param)
    app.get('/my-tasks', async (req, res) => {
      try {
        const userEmail = req.query.email;
        if (!userEmail) {
          return res.status(400).json({ error: "Email is required as query parameter" });
        }
        const userTasks = await tasksCollection.find({ email: userEmail }).toArray();
        res.send(userTasks);
      } catch (error) {
        console.log(' Error fetching user tasks:', error);
        res.status(500).json({ error: 'Failed to fetch user tasks' });
      }
    });

    // Update a task by ID
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
        console.log("Error updating task:", error);
        res.status(500).json({ error: "Failed to update task" });
      }
    });

    // Delete a task by ID
    app.delete('/tasks/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const result = await tasksCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: 'Task not found' });
        }

        res.json({ message: 'Task deleted successfully', deletedCount: result.deletedCount });
      } catch (error) {
        console.log('Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task' });
      }
    });

    //PATCH: Increase bidsCount
    app.patch('/tasks/:id/bid', async (req, res) => {
      try {
        const id = req.params.id;

        // Increment bidsCount by 1
        const result = await tasksCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $inc: { bidsCount: 1 } },
          { returnDocument: 'after' }
        );

        if (!result.value) {
          return res.status(404).json({ error: 'Task not found' });
        }

        res.json({ message: 'Bid placed successfully', bidsCount: result.value.bidsCount });
      } catch (error) {
        console.log(' Error placing bid:', error);
        res.status(500).json({ error: 'Failed to place bid' });
      }
    });

    // Start Express Server 
    app.listen(port, () => {
      console.log(` Server is running on http://localhost:${port}`);
    });

  } catch (error) {
    console.log(' MongoDB connection error:', error);
    process.exit(1);
  }
}


run().catch(console.dir);
