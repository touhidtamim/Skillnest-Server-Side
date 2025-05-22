const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB URI constructed from env variables
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vp1yd11.mongodb.net/?retryWrites=true&w=majority&appName=SkillNest`;

// Create MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect client once at server startup
    await client.connect();
    console.log("MongoDB connected successfully.");

    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB.");


    // Define routes inside or outside — example route to get data from "users" collection
    app.get('/users', async (req, res) => {
      try {
        const database = client.db('yourDatabaseName'); // Replace with your DB name
        const usersCollection = database.collection('users');

        const users = await usersCollection.find({}).toArray();
        res.json(users);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
      }
    });

    
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });

  } catch (err) {
    console.error(err);
    process.exit(1); 
  }
}

run().catch(console.dir);
