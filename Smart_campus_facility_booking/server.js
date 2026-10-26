require("dotenv").config();
const path = require("path");
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Database connection configuration with Railway, cloud, and local support
const dbConfig = {
    host: process.env.DB_HOST || process.env.MYSQLHOST || "localhost",
    port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
    user: process.env.DB_USER || process.env.MYSQLUSER || "root",
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || "",
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || "campus_booking",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
};

if (process.env.DB_SSL === "true" || process.env.MYSQL_SSL === "true") {
    dbConfig.ssl = { rejectUnauthorized: false };
}

// Connection pool handles reconnects, idle timeouts, and concurrent requests
const db = (process.env.DATABASE_URL || process.env.MYSQL_URL)
    ? mysql.createPool(process.env.DATABASE_URL || process.env.MYSQL_URL)
    : mysql.createPool(dbConfig);

// Test pool connection on startup
db.getConnection((err, conn) => {
    if (err) {
        console.error("⚠️ Database connection failed on startup:");
        console.error("Error code:", err.code);
        console.error("Error message:", err.message);
        console.error("Verify DB_HOST, DB_USER, DB_NAME, DB_PORT or Railway MYSQLHOST variables.");
    } else {
        console.log("✅ MySQL database connected successfully via connection pool!");
        conn.release();
    }
});

// Health check endpoint for Railway monitoring
app.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Explicit home page route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/register", (req, res) => {

    const {
        name,
        email,
        phone,
        department,
        id_number,
        password,
        role
    } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            message: "Name, email, and password are required."
        });
    }

    const assignedRole = (role && role.trim().toLowerCase() === "faculty") ? "Faculty" : "student";

    const sql = `
        INSERT INTO user
        (name, email, phone, department, id_number, password, role)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [name, email, phone || null, department || null, id_number || null, password, assignedRole],
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
        SELECT user_id, name, email, phone, department, id_number, role, status
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

            const bookingId = result.insertId;
            const notificationMessage =
                `Your booking request #${bookingId} has been submitted and is pending approval.`;
            const notificationSql = `
                INSERT INTO notification
                (user_id, type, message, is_read)
                VALUES (?, 'pending', ?, 0)
            `;

            db.query(
                notificationSql,
                [user_id, notificationMessage],
                (notificationError) => {
                    if (notificationError) {
                        console.error(
                            "Booking notification insert error:",
                            notificationError
                        );

                        return res.status(201).json({
                            message: "Booking request submitted, but its notification could not be created.",
                            booking_id: bookingId,
                            notification_created: false
                        });
                    }

                    res.status(201).json({
                        message: "Booking request submitted successfully!",
                        booking_id: bookingId,
                        notification_created: true
                    });
                }
            );
        }
    );
});
// my-booking.html
app.get("/my-bookings/:userId", (req, res) => {
    const userId = req.params.userId;

    const sql = `
        SELECT
            b.booking_id,
            b.user_id,
            b.facility_id,
            f.name AS facility_name,
            f.location,
            b.date,
            b.start_time,
            b.end_time,
            b.purpose,
            b.participants,
            b.status,
            b.created_at
        FROM booking b
        JOIN facility f
            ON b.facility_id = f.facility_id
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                message: "Database error"
            });
        }

        res.json(results);
    });
});

app.get("/test", (req, res) => {
    res.send("TEST ROUTE WORKING");
});
console.log("MY UPDATED SERVER.JS IS RUNNING");

// Cancel booking
app.patch("/booking/:bookingId/cancel", (req, res) => {
    const bookingId = req.params.bookingId;
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({
            message: "User ID is required."
        });
    }

    const sql = `
        UPDATE booking
        SET status = 'cancelled'
        WHERE booking_id = ?
        AND user_id = ?
        AND status IN ('pending', 'approved')
    `;

    db.query(sql, [bookingId, user_id], (err, result) => {

        if (err) {
            console.log(err);
            return res.status(500).json({
                message: "Database error."
            });
        }

        if (result.affectedRows === 0) {
            return res.status(400).json({
                message: "Booking cannot be cancelled."
            });
        }

        res.json({
            message: "Booking cancelled successfully!"
        });
    });
});

// ================= ADMIN: GET ALL BOOKINGS =================

app.get("/admin/bookings", (req, res) => {

    const sql = `
        SELECT
            b.booking_id,
            b.user_id,
            u.name AS user_name,
            u.email AS user_email,
            b.facility_id,
            f.name AS facility_name,
            b.date,
            b.start_time,
            b.end_time,
            b.purpose,
            b.participants,
            b.status,
            b.created_at
        FROM booking b
        JOIN user u ON b.user_id = u.user_id
        JOIN facility f ON b.facility_id = f.facility_id
        ORDER BY b.created_at DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.log(err);
            return res.status(500).json({
                message: "Failed to load bookings."
            });
        }

        res.json(results);
    });
});

// ================= ADMIN: UPDATE BOOKING STATUS =================
// ================= ADMIN: UPDATE BOOKING STATUS =================

app.patch("/admin/bookings/:bookingId/status", (req, res) => {

    const bookingId = req.params.bookingId;
    const { status } = req.body;

    const allowedStatuses = [
        "approved",
        "rejected",
        "cancelled"
    ];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
            message: "Invalid booking status."
        });
    }

    // Get booking details
    const getBookingSql = `
        SELECT
            b.booking_id,
            b.user_id,
            f.name AS facility_name
        FROM booking b
        JOIN facility f
            ON b.facility_id = f.facility_id
        WHERE b.booking_id = ?
        AND b.status = 'pending'
    `;

    db.query(getBookingSql, [bookingId], (err, bookings) => {

        if (err) {
            console.error("Get booking error:", err);

            return res.status(500).json({
                message: "Failed to get booking details."
            });
        }

        if (bookings.length === 0) {
            return res.status(400).json({
                message: "Booking cannot be updated."
            });
        }

        const booking = bookings[0];

        // Update booking status
        const updateSql = `
            UPDATE booking
            SET status = ?
            WHERE booking_id = ?
            AND status = 'pending'
        `;

        db.query(
            updateSql,
            [status, bookingId],
            (err, result) => {

                if (err) {
                    console.error("Update booking error:", err);

                    return res.status(500).json({
                        message: "Failed to update booking status."
                    });
                }

                if (result.affectedRows === 0) {
                    return res.status(400).json({
                        message: "Booking could not be updated."
                    });
                }

                // ================= CREATE NOTIFICATION =================

                let notificationMessage = "";

                if (status === "approved") {

                    notificationMessage =
                        `Booking #${booking.booking_id} has been approved for ${booking.facility_name}.`;

                } else if (status === "rejected") {

                    notificationMessage =
                        `Booking #${booking.booking_id} has been rejected for ${booking.facility_name}.`;

                } else if (status === "cancelled") {

                    notificationMessage =
                        `Booking #${booking.booking_id} has been cancelled for ${booking.facility_name}.`;
                }

                const notificationSql = `
                    INSERT INTO notification
                    (user_id, type, message, is_read)
                    VALUES (?, ?, ?, 0)
                `;

                db.query(
                    notificationSql,
                    [
                        booking.user_id,
                        status,
                        notificationMessage
                    ],
                    (err) => {

                        if (err) {

                            console.error(
                                "Notification insert error:",
                                err
                            );

                            return res.status(500).json({
                                message:
                                    "Booking updated, but notification was not created."
                            });
                        }

                        console.log(
                            "Notification created:",
                            booking.user_id,
                            status,
                            notificationMessage
                        );

                        res.json({
                            message:
                                `Booking ${status} successfully!`
                        });
                    }
                );
            }
        );
    });
});

// ================= ADMIN: GET ALL USERS =================
app.get("/admin/users", (req, res) => {

    const sql = `
        SELECT
            user_id,
            name,
            email,
            phone,
            department,
            id_number,
            role,
            status
        FROM user
        ORDER BY user_id DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.log(err);

            return res.status(500).json({
                message: "Failed to load users."
            });
        }

        res.json(results);
    });
});

// ================= ADMIN: ACTIVATE / DEACTIVATE USER =================

app.patch("/admin/users/:userId/status", (req, res) => {

    const userId = req.params.userId;
    const { status } = req.body;

    // Only allow these two statuses
    if (status !== "active" && status !== "inactive") {
        return res.status(400).json({
            message: "Invalid user status."
        });
    }

    const sql = `
        UPDATE user
        SET status = ?
        WHERE user_id = ?
    `;

    db.query(sql, [status, userId], (err, result) => {

        if (err) {
            console.log(err);

            return res.status(500).json({
                message: "Failed to update user status."
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        res.json({
            message: `User ${status === "active" ? "activated" : "deactivated"} successfully!`
        });
    });
});


app.get("/notifications/:userId", (req, res) => {
    const userId = req.params.userId;

    const sql = `
        SELECT
            notification_id,
            user_id,
            type,
            message,
            is_read,
            created_at
        FROM notification
        WHERE user_id = ?
        ORDER BY created_at DESC
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("Notification error:", err);

            return res.status(500).json({
                message: "Failed to load notifications."
            });
        }

        res.json(results);
    });
});

app.patch("/notifications/:notificationId/read", (req, res) => {
    const notificationId = req.params.notificationId;

    const sql = `
        UPDATE notification
        SET is_read = 1
        WHERE notification_id = ?
    `;

    db.query(sql, [notificationId], (err, result) => {

        if (err) {
            console.error("Notification update error:", err);

            return res.status(500).json({
                message: "Failed to mark notification as read."
            });
        }

        res.json({
            message: "Notification marked as read."
        });
    });
});

app.patch("/notifications/user/:userId/read-all", (req, res) => {
    const userId = req.params.userId;

    const sql = `
        UPDATE notification
        SET is_read = 1
        WHERE user_id = ?
    `;

    db.query(sql, [userId], (err, result) => {

        if (err) {
            console.error("Mark all read error:", err);

            return res.status(500).json({
                message: "Failed to mark notifications as read."
            });
        }

        res.json({
            message: "All notifications marked as read."
        });
    });
});

// ================= USER: UPDATE PROFILE =================

app.put("/user/:userId", (req, res) => {

    const userId = req.params.userId;

    const {
        name,
        phone,
        department
    } = req.body;

    if (!name || !phone || !department) {
        return res.status(400).json({
            message: "Please fill all required fields."
        });
    }

    const sql = `
        UPDATE user
        SET
            name = ?,
            phone = ?,
            department = ?
        WHERE user_id = ?
    `;

    db.query(
        sql,
        [name, phone, department, userId],
        (err, result) => {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    message: "Failed to update profile."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "User not found."
                });
            }

            const getUserSql = `
                SELECT
                    user_id,
                    name,
                    email,
                    phone,
                    department,
                    id_number,
                    role,
                    status
                FROM user
                WHERE user_id = ?
            `;

            db.query(
                getUserSql,
                [userId],
                (err, results) => {

                    if (err) {
                        console.log(err);

                        return res.status(500).json({
                            message: "Profile updated but failed to fetch user."
                        });
                    }

                    res.json({
                        message: "Profile updated successfully!",
                        user: results[0]
                    });
                }
            );
        }
    );
});

// ================= ADMIN: ADD FACILITY =================

app.post("/facility", (req, res) => {

    const {
        name,
        category,
        location,
        capacity,
        description,
        open_time,
        close_time,
        status
    } = req.body;

    if (
        !name ||
        !category ||
        !location ||
        !capacity ||
        !open_time ||
        !close_time
    ) {
        return res.status(400).json({
            message: "Please fill all required facility fields."
        });
    }

    if (open_time >= close_time) {
        return res.status(400).json({
            message: "Closing time must be after opening time."
        });
    }

    const sql = `
        INSERT INTO facility
        (
            name,
            category,
            location,
            capacity,
            description,
            open_time,
            close_time,
            status,
            availability
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            name,
            category,
            location,
            capacity,
            description || "",
            open_time,
            close_time,
            status || "active",
            "available"
        ],
        (err, result) => {

            if (err) {
                console.log("Add facility error:", err);

                return res.status(500).json({
                    message: "Failed to add facility."
                });
            }

            res.json({
                message: "Facility added successfully!",
                facility_id: result.insertId
            });
        }
    );
});


// ================= ADMIN: UPDATE FACILITY =================

app.put("/facility/:id", (req, res) => {

    const facilityId = req.params.id;

    const {
        name,
        category,
        location,
        capacity,
        description,
        open_time,
        close_time,
        status
    } = req.body;

    if (
        !name ||
        !category ||
        !location ||
        !capacity ||
        !open_time ||
        !close_time
    ) {
        return res.status(400).json({
            message: "Please fill all required facility fields."
        });
    }

    if (open_time >= close_time) {
        return res.status(400).json({
            message: "Closing time must be after opening time."
        });
    }

    const sql = `
        UPDATE facility
        SET
            name = ?,
            category = ?,
            location = ?,
            capacity = ?,
            description = ?,
            open_time = ?,
            close_time = ?,
            status = ?
        WHERE facility_id = ?
    `;

    db.query(
        sql,
        [
            name,
            category,
            location,
            capacity,
            description || "",
            open_time,
            close_time,
            status || "active",
            facilityId
        ],
        (err, result) => {

            if (err) {
                console.log("Update facility error:", err);

                return res.status(500).json({
                    message: "Failed to update facility."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Facility not found."
                });
            }

            res.json({
                message: "Facility updated successfully!"
            });
        }
    );
});


// ================= ADMIN: DELETE FACILITY =================

app.delete("/facility/:id", (req, res) => {

    const facilityId = req.params.id;

    // Soft delete
    const sql = `
        UPDATE facility
        SET status = 'inactive'
        WHERE facility_id = ?
    `;

    db.query(sql, [facilityId], (err, result) => {

        if (err) {
            console.log("Delete facility error:", err);

            return res.status(500).json({
                message: "Failed to delete facility."
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Facility not found."
            });
        }

        res.json({
            message: "Facility deleted successfully!"
        });
    });
});

// Serve static frontend assets
app.use(express.static(path.join(__dirname, ".")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});


