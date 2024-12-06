const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const session = require('express-session');
const cors = require('cors');

const app = express();
const port = 3000;

// MongoDB connection URI
const uri = 'mongodb://admin:Sp00ky%21@localhost:27017/?authSource=admin';
const client = new MongoClient(uri, { useUnifiedTopology: true });

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
    session({
        secret: 'your-secret-key',
        resave: false,
        saveUninitialized: true,
    })
);

// Connect to MongoDB
async function connectDB() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('Error connecting to MongoDB', err);
    }
}
connectDB();

// Authentication middleware
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized access. Please log in.' });
}

// Register a user
app.post('/register', async (req, res) => {
    const { email, password } = req.body;

    try {
        const db = client.db('library');
        const users = db.collection('users');

        // Check if user already exists
        const existingUser = await users.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save user to database
        await users.insertOne({ email, password: hashedPassword });
        res.json({ success: true, message: 'User registered successfully.' });
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Login a user
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const db = client.db('library');
        const users = db.collection('users');

        // Find user in database
        const user = await users.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid email or password.' });
        }

        // Compare password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Invalid email or password.' });
        }

        // Save user session
        req.session.user = { id: user._id, email: user.email };
        res.json({ success: true, message: 'Login successful.' });
    } catch (err) {
        console.error('Error logging in:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Logout a user
app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true, message: 'Logout successful.' });
    });
});

// Check if user is authenticated
app.get('/is-authenticated', (req, res) => {
    res.json({ authenticated: !!req.session.user });
});

// Add a book
app.post('/books', isAuthenticated, async (req, res) => {
    const { title, author, genre, year, isbn, description } = req.body;

    try {
        const db = client.db('library');
        const books = db.collection('books');
        const result = await books.insertOne({ title, author, genre, year, isbn, description });
        res.json({ success: true, message: 'Book added successfully.', bookId: result.insertedId });
    } catch (err) {
        console.error('Error adding book:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Fetch all books
app.get('/books', async (req, res) => {
    try {
        const db = client.db('library');
        const books = db.collection('books');
        const allBooks = await books.find().toArray();
        res.json(allBooks);
    } catch (err) {
        console.error('Error fetching books:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Fetch a single book by ID
app.get('/books/:id', async (req, res) => {
    const bookId = req.params.id;

    try {
        const db = client.db('library');
        const book = await db.collection('books').findOne({ _id: new ObjectId(bookId) });
        if (!book) {
            return res.status(404).json({ error: 'Book not found.' });
        }
        res.json(book);
    } catch (err) {
        console.error('Error fetching book:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Edit a book
app.put('/books/:id', isAuthenticated, async (req, res) => {
    const bookId = req.params.id;
    const { title, author, genre, year, isbn, description } = req.body;

    try {
        const db = client.db('library');
        const books = db.collection('books');
        const result = await books.updateOne(
            { _id: new ObjectId(bookId) },
            { $set: { title, author, genre, year, isbn, description } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Book not found.' });
        }

        res.json({ success: true, message: 'Book updated successfully.' });
    } catch (err) {
        console.error('Error updating book:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Delete a book
app.delete('/books/:id', isAuthenticated, async (req, res) => {
    const bookId = req.params.id;

    try {
        const db = client.db('library');
        const books = db.collection('books');
        const result = await books.deleteOne({ _id: new ObjectId(bookId) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Book not found.' });
        }

        res.json({ success: true, message: 'Book deleted successfully.' });
    } catch (err) {
        console.error('Error deleting book:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
