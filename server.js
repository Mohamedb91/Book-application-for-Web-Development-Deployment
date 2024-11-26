//npm install express mongodb body-parser, npm install cors

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');  // Require CORS module

const app = express();
const port = 3000;

// Connection URI
const uri = "ADD MONGOBD STRING";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cors());  // Use CORS middleware to allow cross-origin requests
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB
async function connectDB() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");
    } catch (e) {
        console.error("Could not connect to MongoDB", e);
    }
}

// Route for the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// POST endpoint to add books
app.post('/books', async (req, res) => {
    try {
        const bookData = req.body;
        const result = await client.db("library").collection("books").insertOne(bookData);
        res.status(201).json(result);
    } catch (e) {
        res.status(500).send(e.toString());
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    connectDB(); // Connect to MongoDB when the server starts
});
