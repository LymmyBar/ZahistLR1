const uuid = require('uuid');
const express = require('express');
const onFinished = require('on-finished');
const bodyParser = require('body-parser');
const path = require('path');
const port = 3000;
const fs = require('fs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const SESSION_KEY = 'Authorization';
const JWT_SECRET = 'very_secret_key_change_me';

class Session {
    #sessions = {}

    constructor() {
        try {
            this.#sessions = fs.readFileSync('./sessions.json', 'utf8');
            this.#sessions = JSON.parse(this.#sessions.trim());

            console.log(this.#sessions);
        } catch(e) {
            this.#sessions = {};
        }
    }

    #storeSessions() {
        fs.writeFileSync('./sessions.json', JSON.stringify(this.#sessions), 'utf-8');
    }

    set(key, value) {
        if (!value) {
            value = {};
        }
        this.#sessions[key] = value;
        this.#storeSessions();
    }

    get(key) {
        return this.#sessions[key];
    }

    init(res) {
        const sessionId = uuid.v4();
        this.set(sessionId);

        return sessionId;
    }

    destroy(req, res) {
        const sessionId = req.sessionId;
        delete this.#sessions[sessionId];
        this.#storeSessions();
    }
}

const sessions = new Session();

app.use((req, res, next) => {
    let currentSession = {};
    const authHeader = req.get(SESSION_KEY);

    if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        try {
            const payload = jwt.verify(token, JWT_SECRET);
            req.session = payload;
        } catch (e) {
            req.session = {};
        }
    } else {
        req.session = {};
    }

    next();
});

app.get('/', (req, res) => {
    if (req.session.username) {
        return res.json({
            username: req.session.username,
            logout: 'http://localhost:3000/logout'
        })
    }
    res.sendFile(path.join(__dirname+'/index.html'));
})

app.get('/logout', (req, res) => {
    sessions.destroy(req, res);
    res.redirect('/');
});

const users = [
    {
        login: 'Login',
        password: 'Password',
        username: 'Username',
    },
    {
        login: 'Login1',
        password: 'Password1',
        username: 'Username1',
    }
]

app.post('/api/login', (req, res) => {
    const { login, password } = req.body;

    const user = users.find((user) => {
        if (user.login == login && user.password == password) {
            return true;
        }
        return false
    });

    if (user) {
        const payload = {
            username: user.username,
            login: user.login
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        return res.json({ token, username: user.username });
    }

    return res.status(401).send();
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
