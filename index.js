const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); 
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });
  

  app.use(express.json());




  
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dxgrzuk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    // strict: true,
    strict: false,

    deprecationErrors: true,
  }
});

async function run() {
  try {
  

    const database = client.db("resturantDB");
    const foodsCollection =database.collection("foods");




    app.post('/foods',async(req,res)=>{
        const newFood= req.body;
        console.log(newFood);
        result = await foodsCollection.insertOne(newFood);
        console.log(result);
        res.send(result);

    });

  

 
    
     
   

 
   
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

  
app.get('/',(req,res)=>{
    res.send('Artstry server')
});





app.listen(port,()=>{
    console.log(`Server is running on port: ${port}`);
})