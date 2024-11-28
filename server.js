//npm install express mongodb body-parser, npm install cors

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');

const app = express();
const port = 3000

// MongoDB connection URI
const uri = "mongodb://admin:Sp00ky!@localhost:27017/?AuthSource=admin";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// Middleware to serve static files and parse request bodies
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors()); // Enable CORS for all domains
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
        const result = await client.db("library").collection("books").insertOne(req.body);
        console.log("Book Added", result);
        res.redirect('/book-details.html'); // Redirect back to the book details page or confirmation page
    } catch (e) {
        res.status(500).send(e.toString());
    }
});

// GET endpoint to fetch books
app.get('/books', async (req, res) => {
    try {
        const books = await client.db("library").collection("books").find({}).toArray();
        res.json(books);
    } catch (e) {
        res.status(500).send(e.toString());
    }
});

// PUT endpoint to update a book
app.put('/books/:id', async (req, res) => {
    try {
        const result = await client.db("library").collection("books").updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: req.body }
        );
        res.json(result);
    } catch (e) {
        res.status(500).send(e.toString());
    }
});

// DELETE endpoint to remove a book
app.delete('/books/:id', async (req, res) => {
    try {
        const result = await client.db("library").collection("books").deleteOne({ _id: new ObjectId(req.params.id) });
        res.json(result);
    } catch (e) {
        res.status(500).send(e.toString());
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    connectDB(); // Connect to MongoDB when the server start
});
