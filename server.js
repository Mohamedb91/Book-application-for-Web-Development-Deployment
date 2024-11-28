const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');

const app = express();
const port = 3000;

// MongoDB connection URI
const uri = 'mongodb://admin:Sp00ky%21@localhost:27017/?authSource=admin';
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
        const book = {
            title: req.body.title,
            author: req.body.author,
            genre: req.body.genre,
            year: req.body.year,
            isbn: req.body.isbn,
            description: req.body.description,
        };

        await client.db("library").collection("books").insertOne(book);

        // Redirect to book-details.html after successful addition
        res.redirect('/book-details.html');
    } catch (e) {
        console.error("Error adding book:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// GET endpoint to fetch all books
app.get('/books', async (req, res) => {
    try {
        const books = await client.db("library").collection("books").find({}).toArray();
        res.json(books);
    } catch (e) {
        console.error("Error fetching books:", e);
        res.status(500).send(e.toString());
    }
});

// GET a specific book by ID
app.get('/books/:id', async (req, res) => {
    try {
        const book = await client.db("library").collection("books").findOne({ _id: new ObjectId(req.params.id) });
        if (!book) {
            return res.status(404).send({ message: "Book not found" });
        }
        res.json(book);
    } catch (error) {
        console.error("Error fetching book:", error);
        res.status(500).send({ message: error.message });
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
        console.error("Error updating book:", e);
        res.status(500).send(e.toString());
    }
});

// DELETE endpoint to remove a book
app.delete('/books/:id', async (req, res) => {
    try {
        const result = await client.db("library").collection("books").deleteOne({ _id: new ObjectId(req.params.id) });
        res.json(result);
    } catch (e) {
        console.error("Error deleting book:", e);
        res.status(500).send(e.toString());
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    connectDB(); // Connect to MongoDB when the server starts
});
