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

app.get("/facilities", (req, res) => {

    const sql = `
        SELECT
            facility_id,
            name,
            category,
            location,
            capacity,
            description,
            open_time,
            close_time,
            status,
            availability
        FROM facility
        WHERE status = 'active'
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.log(err);

            return res.status(500).json({
                message: "Database error"
            });
        }

        res.json(results);
    });
});

app.post("/booking", (req, res) => {

    const {
        user_id,
        facility_id,
        date,
        start_time,
        end_time,
        purpose,
        participants
    } = req.body;

    // Basic validation
    if (!user_id || !facility_id || !date || !start_time || !end_time) {
        return res.status(400).json({
            message: "Please fill all required fields."
        });
    }

    const sql = `
        INSERT INTO booking
        (user_id, facility_id, date, start_time, end_time, purpose, participants)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            user_id,
            facility_id,
            date,
            start_time,
            end_time,
            purpose,
            participants
        ],
        (err, result) => {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    message: "Booking failed"
                });
            }

            res.json({
                message: "Booking request submitted successfully!",
                booking_id: result.insertId
            });
        }
    );
});

//Get one facility
app.get("/facility/:id", (req, res) => {

    const facilityId = req.params.id;

    const sql = `
        SELECT
            facility_id,
            name,
            category,
            location,
            capacity,
            description,
            open_time,
            close_time,
            status,
            availability
        FROM facility
        WHERE facility_id = ?
    `;

    db.query(sql, [facilityId], (err, results) => {

        if (err) {
            console.log(err);

            return res.status(500).json({
                message: "Database error"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Facility not found"
            });
        }

        res.json(results[0]);
    });
});

//Check booking availability

app.post("/check-availability", (req, res) => {

    const {
        facility_id,
        date,
        start_time,
        end_time
    } = req.body;

    if (!facility_id || !date || !start_time || !end_time) {
        return res.status(400).json({
            message: "Please provide all booking details."
        });
    }

    if (start_time >= end_time) {
        return res.status(400).json({
            message: "End time must be after start time."
        });
    }

    // First check facility status
    const facilitySql = `
        SELECT availability
        FROM facility
        WHERE facility_id = ?
    `;

    db.query(facilitySql, [facility_id], (err, facilityResults) => {

        if (err) {
            console.log(err);

            return res.status(500).json({
                message: "Database error"
            });
        }

        if (facilityResults.length === 0) {
            return res.status(404).json({
                message: "Facility not found."
            });
        }

        if (facilityResults[0].availability.toLowerCase() !== "available") {
            return res.status(400).json({
                message: "This facility is currently not available."
            });
        }

        // Check existing bookings
        const bookingSql = `
            SELECT booking_id
            FROM booking
            WHERE facility_id = ?
            AND date = ?
            AND status IN ('pending', 'approved')
            AND start_time < ?
            AND end_time > ?
        `;

        db.query(
            bookingSql,
            [facility_id, date, end_time, start_time],
            (err, bookings) => {

                if (err) {
                    console.log(err);

                    return res.status(500).json({
                        message: "Database error"
                    });
                }

                if (bookings.length > 0) {
                    return res.json({
                        available: false,
                        message: "This time slot is already booked."
                    });
                }

                res.json({
                    available: true,
                    message: "This time slot is available."
                });
            }
        );
    });
});
//Create a new booking
app.post("/booking", (req, res) => {

    const {
        user_id,
        facility_id,
        date,
        start_time,
        end_time,
        purpose,
        participants
    } = req.body;

    if (
        !user_id ||
        !facility_id ||
        !date ||
        !start_time ||
        !end_time ||
        !purpose ||
        !participants
    ) {
        return res.status(400).json({
            message: "Please fill all required fields."
        });
    }

    if (start_time >= end_time) {
        return res.status(400).json({
            message: "End time must be after start time."
        });
    }

    const sql = `
        INSERT INTO booking
        (user_id, facility_id, date, start_time, end_time, purpose, participants)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            user_id,
            facility_id,
            date,
            start_time,
            end_time,
            purpose,
            participants
        ],
        (err, result) => {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    message: "Booking failed."
                });
            }

            res.json({
                message: "Booking request submitted successfully!",
                booking_id: result.insertId
            });
        }
    );
});
app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});