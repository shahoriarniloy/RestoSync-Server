const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dxgrzuk.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    const database = client.db("resturantDB");
    const foodsCollection = database.collection("foods");
    const purchaseCollection = database.collection("purchases");
    const feedbackCollection = database.collection("feedbacks");



    // Get all foods
    app.get('/foods', async (req, res) => {
      try {
        const cursor = foodsCollection.find();
        const result = await cursor.toArray();
        res.json(result);
      } catch (error) {
        console.error("Error retrieving foods:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Add a new food
    app.post('/foods', async (req, res) => {
      try {
        const newFood = req.body;
        const result = await foodsCollection.insertOne(newFood);
        res.json(result);
      } catch (error) {
        console.error("Error adding food:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Get top foods
    app.get('/topfoods', async (req, res) => {
      try {
        const topFoods = await foodsCollection.find()
                          .sort({ count: -1, _id: 1 }) 
                          .limit(6)
                          .toArray();
        res.json(topFoods);
      } catch (error) {
        console.error("Error retrieving top foods:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Get single food by ID
    app.get('/fooddetails/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const food = await foodsCollection.findOne({ _id: new ObjectId(id) }); 
        if (!food) {
          return res.status(404).json({ error: "Food not found" });
        }
        res.json(food);
      } catch (error) {
        console.error("Error retrieving food:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

   // purchasing a food item
   app.post('/purchase', async (req, res) => {
    try {
      const newPurchase = req.body;
      const result = await purchaseCollection.insertOne(newPurchase);
      await foodsCollection.updateOne(
        { _id: new ObjectId(newPurchase.foodId) },
        { $inc: { count: 1 } }
      );
      res.json(result);
    } catch (error) {
      console.error("Error purchasing food:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get('/feedback', async (req, res) => {
    try {
      const cursor = feedbackCollection.find();
      const result = await cursor.toArray();
      res.json(result);
    } catch (error) {
      console.error("Error retrieving foods:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post('/feedback', async (req, res) => {
    try {
      const newFeedback = req.body;
      const result = await feedbackCollection.insertOne(newFeedback);
      res.json(result);
    } catch (error) {
      console.error("Error adding food:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });






  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// Default route
app.get('/', (req, res) => {
  res.send('RestoSync Server');
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
