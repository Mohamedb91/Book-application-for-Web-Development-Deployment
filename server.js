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

// Middleware to check if user is admin
function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.email === 'admin@gmail.com') {
        return next();
    }
    res.status(403).json({ error: 'Forbidden. Admin access only.' });
}

// Admin account created if doesnt exist
async function createAdminAccount() {
    const db = client.db('library');
    const users = db.collection('users');
    const existingAdmin = await users.findOne({ email: 'admin@gmail.com' });

    if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash('admin', 10);
        await users.insertOne({ email: 'admin@gmail.com', password: hashedPassword });
        console.log('Admin account created.');
    } else {
        console.log('Admin account already exists.');
    }
}

createAdminAccount();

// Protect the Profile Page
app.get('/profile.html', (req, res) => {
    if (!req.session.user) {
        return res
            .status(401)
            .send('<h1>401 Unauthorized</h1><p>You must be logged in to access this page.</p>');
    }
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

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

// Add a book to user's favorites
app.post('/favorites', isAuthenticated, async (req, res) => {
    const { bookId } = req.body;

    try {
        const db = client.db('library');
        const users = db.collection('users');
        const books = db.collection('books');

        // Check if the book exists
        const book = await books.findOne({ _id: new ObjectId(bookId) });
        if (!book) {
            return res.status(404).json({ error: 'Book not found.' });
        }

        // Add book to user's favorites
        await users.updateOne(
            { _id: new ObjectId(req.session.user.id) },
            { $addToSet: { favorites: book } } // Avoid duplicate entries
        );

        res.json({ success: true, message: 'Book added to favorites.' });
    } catch (err) {
        console.error('Error adding book to favorites:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Remove a book from user's favorites
app.delete('/favorites/:bookId', isAuthenticated, async (req, res) => {
    const { bookId } = req.params;

    try {
        const db = client.db('library');
        const users = db.collection('users');

        // Remove the book from the favorites array
        await users.updateOne(
            { _id: new ObjectId(req.session.user.id) },
            { $pull: { favorites: { _id: new ObjectId(bookId) } } }
        );

        res.json({ success: true, message: 'Book removed from favorites.' });
    } catch (err) {
        console.error('Error removing book from favorites:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Fetch user's favorite books
app.get('/profile/favorites', isAuthenticated, async (req, res) => {
    try {
        const db = client.db('library');
        const users = db.collection('users');
        const user = await users.findOne({ _id: new ObjectId(req.session.user.id) });

        if (!user || !user.favorites) {
            return res.json([]);
        }

        res.json(user.favorites);
    } catch (err) {
        console.error('Error fetching favorite books:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Serve view-book.html
app.get('/view-book.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'view-book.html'));
});

// Check if user is authenticated
app.get('/is-authenticated', (req, res) => {
    res.json({ authenticated: !!req.session.user });
});

// Add a book
app.post('/books', isAdmin, async (req, res) => {
    const { title, author, genre, year, isbn, description, imageUrl } = req.body;

    try {
        const db = client.db('library');
        const books = db.collection('books');
        const result = await books.insertOne({ title, author, year, isbn, description, imageUrl });
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
app.put('/books/:id', isAdmin, async (req, res) => {
    const bookId = req.params.id;
    const { title, author, year, isbn, description } = req.body;

    try {
        const db = client.db('library');
        const books = db.collection('books');
        const result = await books.updateOne(
            { _id: new ObjectId(bookId) },
            { $set: { title, author, year, isbn, description } }
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
app.delete('/books/:id', isAdmin, async (req, res) => {
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

// Edit User Password
app.put('/profile/password', isAuthenticated, async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    try {
        const db = client.db('library');
        const users = db.collection('users');

        const user = await users.findOne({ _id: new ObjectId(req.session.user.id) });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Incorrect current password.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const result = await users.updateOne(
            { _id: new ObjectId(req.session.user.id) },
            { $set: { password: hashedPassword } }
        );

        if (result.matchedCount === 0) {
            return res.status(500).json({ error: 'Failed to update password.' });
        }

        res.json({ success: true, message: 'Password updated successfully.' });
    } catch (err) {
        console.error('Error updating password:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Search books by query
app.get('/api/books', async (req, res) => {
    const query = req.query.query;
    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required.' });
    }

    try {
        const db = client.db('library');
        const books = db.collection('books');

        // Search by title, author, or ISBN (case-insensitive)
        const results = await books
            .find({
                $or: [
                    { title: { $regex: query, $options: 'i' } },
                    { author: { $regex: query, $options: 'i' } },
                    { isbn: { $regex: query, $options: 'i' } },
                ],
            })
            .toArray();

        res.json(results);
    } catch (err) {
        console.error('Error searching books:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
