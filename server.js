const express = require('express');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const json2xls = require('json2xls');

const app = express();
const port = process.env.PORT || 3000; // Use process.env.PORT for Heroku compatibility

// Create SQLite database
const db = new sqlite3.Database(':memory:'); // Use in-memory database for Heroku

// Create users table
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT,
        website TEXT,
        city TEXT,
        company TEXT
    )`);
});

// Home Page
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head>
            <style>
                body {
                    text-align: center;
                }
                .btn {
                    background-color: #007bff;
                    color: #fff;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background-color 0.3s;
                }
            </style>
        </head>
        <body>
            <h1>Cointab SE-ASSIGNMENT</h1>
            <a href="/users" class="btn">All Users</a>
        </body>
        </html>
    `);
});

// All Users Page
app.get('/users', async (req, res) => {
    try {
        // Fetch user data from the API
        const response = await axios.get('https://jsonplaceholder.typicode.com/users');
        const users = response.data;

        // Render user information
        const userList = [];
        for (const user of users) {
            const exists = await checkUserExists(user.email);
            const addButton = exists ? '' : `<button onclick="addUser('${user.name}', '${user.email}')">Add</button>`;
            const openButton = exists ? `<a href="/posts/${user.id}">Open</a>` : '';
            userList.push(`
                <div>
                    <h2>${user.name}</h2>
                    <p>Email: ${user.email}</p>
                    <p>Phone: ${user.phone}</p>
                    <p>Website: ${user.website}</p>
                    <p>City: ${user.address.city}</p>
                    <p>Company: ${user.company.name}</p>
                    ${addButton}
                    ${openButton}
                </div>
            `);
        }

        res.send(`
            <html>
            <head>
                <style>
                    body {
                        text-align: center;
                    }
                </style>
                <script>
                    async function addUser(name, email) {
                        try {
                            const response = await fetch('/addUser', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ name, email })
                            });
                            if (response.ok) {
                                location.reload(); // Refresh the page to update buttons
                            } else {
                                console.error('Failed to add user');
                            }
                        } catch (error) {
                            console.error('Error adding user:', error);
                        }
                    }
                </script>
            </head>
            <body>
                <h1>All Users</h1>
                ${userList.join('')}
                <a href="/">Home</a>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Endpoint to add a user to the database
app.post('/addUser', express.json(), async (req, res) => {
    const { name, email } = req.body;
    try {
        await insertUser(name, email);
        res.sendStatus(200);
    } catch (error) {
        console.error('Error adding user to database:', error);
        res.sendStatus(500);
    }
});

// Function to check if a user exists in the database
function checkUserExists(email) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(!!row);
            }
        });
    });
}

// Function to insert a user into the database
function insertUser(name, email) {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO users (name, email) VALUES (?, ?)', [name, email], (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// Endpoint to fetch and display posts for a specific user
app.get('/posts/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        // Fetch user data from the API
        const userResponse = await axios.get(`https://jsonplaceholder.typicode.com/users/${userId}`);
        const user = userResponse.data;

        // Fetch posts data for the specific userId from the API
        const postResponse = await axios.get(`https://jsonplaceholder.typicode.com/posts?userId=${userId}`);
        const posts = postResponse.data;

        // Render posts information
        const postList = posts.map(post => `
            <div>
                <h2>${post.title}</h2>
                <p>${post.body}</p>
                <p>By: ${user.name}</p>
                <p>Company: ${user.company.name}</p>
            </div>
        `).join('');

        res.send(`
            <html>
            <head>
                <style>
                    body {
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <h1>Posts for User ${user.name}</h1>
                ${postList}
                <a href="/users">Back to Users</a>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
