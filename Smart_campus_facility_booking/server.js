const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Ayush@123",
    database: "campus_booking"
});

db.connect((err) => {
    if (err) {
        console.log("Database connection failed:");
        console.log(err.message);
    } else {
        console.log("MySQL connected successfully!");
    }
});

app.get("/", (req, res) => {
    res.send("Smart Campus Booking Server is running!");
});

app.post("/register", (req, res) => {

    const {
        name,
        email,
        phone,
        department,
        id_number,
        password
    } = req.body;

    const sql = `
        INSERT INTO user
        (name, email, phone, department, id_number, password)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [name, email, phone, department, id_number, password],
        (err, result) => {

            if (err) {
                console.log(err);

                if (err.code === "ER_DUP_ENTRY") {
                    return res.status(400).json({
                        message: "Email or ID number already exists"
                    });
                }

                return res.status(500).json({
                    message: "Database error"
                });
            }

            res.json({
                message: "Registration successful!",
                user_id: result.insertId
            });
        }
    );
});

app.post("/login", (req, res) => {

    const { email, password } = req.body;

    const sql = `
        SELECT user_id, name, email, department, id_number, role, status
        FROM user
        WHERE email = ? AND password = ?
    `;

    db.query(sql, [email, password], (err, results) => {

        if (err) {
            console.log(err);

            return res.status(500).json({
                message: "Database error"
            });
        }

        // No matching user
        if (results.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = results[0];

        // Check account status
        if (user.status !== "active") {
            return res.status(403).json({
                message: "Your account is not active"
            });
        }

        res.json({
            message: "Login successful!",
            user: user
        });
    });
});

app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});