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
    const usersCollection = database.collection("users");



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
          newFood.quantity = parseInt(newFood.quantity);
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
        const updateResult = await foodsCollection.updateOne(
            { _id: new ObjectId(newPurchase.foodId) },
            { $inc: { count: 1, quantity: -newPurchase.quantity } }
        );
        console.log('Update result:', updateResult);
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



  app.post('/register', async (req, res) => {
    try {
        const { name, email, profileUrl } = req.body;

        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "Email already exists" });
        }

        const result = await usersCollection.insertOne({
            name,
            email,
            profileUrl
        });

        res.json(result);
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});



app.get('/userfoods/:email', async (req, res) => {
  const email = req.params.email;
  const query = { 'addedBy.email': email }; 
  const foods = await foodsCollection.find(query).toArray();
  res.send(foods);
});

app.get('/userpurchase/:email', async (req, res) => {
  const email = req.params.email;
  const query = { 'buyerEmail': email }; 
  const foods = await purchaseCollection.find(query).toArray();
  res.send(foods);
});



const ObjectId = require('mongodb').ObjectId;

app.put('/userfood/update/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const art = req.body;

        const filter = { _id: new ObjectId(id) };
        const update = {
            $set: {
                image: art.foodImage,
                item_name: art.foodName,
                foodCategory: art.foodCategory,
                quantity: art.quantity,
                price: art.price,
                foodOrigin: art.foodOrigin,
                short_description: art.shortDescription,
                user_email: art.addBy.email,
                user_name: art.addBy.name
            }
        };

        const options = { upsert: true };

        const result = await foodsCollection.updateOne(filter, update, options);

        if (result.modifiedCount === 1) {
            res.status(200).json({ message: "Food item updated successfully" });
        } else {
            res.status(404).json({ error: "Food item not found" });
        }
    } catch (error) {
        console.error("Error updating food item:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.delete('/userpurchase/:id', async (req,res) =>{
  const id = req.params.id;
  const query = {_id: new ObjectId(id) }
  const result = await purchaseCollection.deleteOne(query);
  res.send(result);
})








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
