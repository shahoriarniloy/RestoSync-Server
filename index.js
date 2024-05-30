const express = require('express');
const cookieParser = require('cookie-parser');

const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const app = express();
app.use(cookieParser());

const port = process.env.PORT || 5000;


const corsOptions = {
  origin: [
    // 'http://localhost:5173',
    'https://restosync-3d474.web.app',
    'https://restosync-3d474.firebaseapp.com',
  'https://restosync.netlify.app'
],
  credentials: true
};

app.use(cors(corsOptions));



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

const logger = (req, res, next)=>{
  console.log('log:info',req.method, req.url);
  next();
}

const verifyToken = (req, res, next)=>
  {
    const token=req.cookies?.token;
    console.log('token in the middleware',token);
    if(!token){
      return res.status(401).send({message:'Unauthorized Access'})
    }
    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
      if(err){      
        return res.status(401).send({message:'Unauthorized Access'})

      }
    req.user=decoded;
    next();
    })
  }

  const cookieOption = {
    httpOnly: true,
    secure:  process.env.NODE_ENV === "production"? true: false,
    sameSite: process.env.NODE_ENV === "production"? "none": "strict",
  };

  // const cookieOptions = {
  //   httpOnly: true,
  //   secure: process.env.NODE_ENV === "production",
  //   sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  // };
async function run() {
  try {
    // await client.connect();
    const database = client.db("resturantDB");
    const foodsCollection = database.collection("foods");
    const purchaseCollection = database.collection("purchases");
    const feedbackCollection = database.collection("feedbacks");
    const usersCollection = database.collection("users");


    app.post('/jwt', async (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: '1h'
        });

        res.cookie('token',token, cookieOption).send({ success: true });
      });

      app.get('/userpurchase/:email',logger,verifyToken, async (req, res) => {
        console.log('token owner',req.user);
        const email = req.params.email;
        if(req.user.email!==email){
          return res.status(403).send({message:'forbidden access'})
        }
        const query = { 'buyerEmail': email }; 
        const foods = await purchaseCollection.find(query).toArray();
        res.send(foods);
      });
      
     

      app.get('/foods/category/:categoryName', async (req, res) => {
        try {
            const categoryName = req.params.categoryName;
            const cursor = foodsCollection.find({ foodCategory: categoryName });
            const result = await cursor.toArray();
            res.json(result);
        } catch (error) {
            console.error("Error retrieving foods by category:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    

      
      
      app.post('/logout',async(req,res)=>{
        const user = req.body;
        console.log('logging out', user);
        res.clearCookie('token',{...cookieOption , maxAge:0}).send({success:true})
      })


    



    // Get all foods
    app.get('/foods', async (req, res) => {
      // const email = req.query.email;
      // if(req.user.email!==email){
      //   return res.status(403).send({message:'forbidden access'})
      // }
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
    app.post('/foods', logger, verifyToken, async (req, res) => {
      try {
          console.log('user:', req.user.email); 
          const email = req.user.email; 
          const newFood = req.body;
  
          if (req.user.email !== newFood.addedBy.email) {
              return res.status(403).send({ message: 'forbidden access' });
          }
  
          newFood.quantity = parseInt(newFood.quantity);
  
          const result = await foodsCollection.insertOne(newFood);
  
          res.json({ insertedId: result.insertedId });
      } catch (error) {
          console.error("Error adding food:", error);
          res.status(500).json({ error: "Internal server error" });
      }
  });
  
  
  app.get('/userfoods/:email', logger,verifyToken,async (req, res) => {
    const email = req.params.email;
      if(req.user.email!==email){
        return res.status(403).send({message:'forbidden access'})
      }
    const query = { 'addedBy.email': email }; 
    const foods = await foodsCollection.find(query).toArray();
    res.send(foods);
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
   

  app.post('/purchase', logger,verifyToken, async (req, res) => {
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


  app.get('/feedback',  async (req, res) => {
    try {
      const email = req.query.email;
     
      const cursor = feedbackCollection.find();
      const result = await cursor.toArray();
      res.json(result);
    } catch (error) {
      console.error("Error retrieving foods:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post('/feedback', logger,verifyToken, async (req, res) => {
    
    const email = req.body.email;
      if(req.user.email!==email){
        return res.status(403).send({message:'forbidden access'})
      }
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









const ObjectId = require('mongodb').ObjectId;

app.put('/userfood/update/:id', logger,verifyToken,async (req, res) => {

  const email = req.body.addBy.email;
      if(req.user.email!==email){
        return res.status(403).send({message:`forbidden access ${email}`})
      }

    try {
        const id = req.params.id;
        const art = req.body;
        

        const filter = { _id: new ObjectId(id) };
        const update = {
            $set: {
                image: art.foodImage,
                item_name: art.foodName,
                foodCategory: art.foodCategory,
                quantity: parseInt(art.quantity),
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

app.delete('/userpurchase/:id', logger,verifyToken, async (req,res) =>{
  const id = req.params.id;
  const query = {_id: new ObjectId(id) }
  const result = await purchaseCollection.deleteOne(query);
  res.send(result);
})

 // Get all categories
 app.get('/categories', async (req, res) => {
  try {
    const categories = await foodsCollection.distinct('foodCategory');
    res.json(categories);
  } catch (error) {
    console.error("Error retrieving categories:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get foods by category
app.get('/categoryfoods/:category', async (req, res) => {
  try {
    const category = req.params.category;
    const foods = await foodsCollection.find({ foodCategory: category }).toArray();
    res.json(foods);
  } catch (error) {
    console.error("Error retrieving foods by category:", error);
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
