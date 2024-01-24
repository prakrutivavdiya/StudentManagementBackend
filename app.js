const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const { DBConst } = require('./constants');

const app = express();
const port = 3001;

app.use(bodyParser.json());

// Create MySQL connection
const pool = mysql.createPool({
    host: DBConst.host,
    user: DBConst.user,
    password: DBConst.password,
    database: DBConst.database,
    port: DBConst.port
});

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        throw err;
    }
    console.log('MySQL Connected');
});

// Validation middleware for common fields
const validateCommonFields = (req, res, next) => {
    const { name, dateOfBirth, gender } = req.body;

    if (!name || !dateOfBirth || !gender) {
        return res.status(400).json({ error: 'Name, dateOfBirth, and gender are required fields.' });
    }

    next();
};

// Validation middleware for ID parameters
const validateIdParam = (req, res, next) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID parameter.' });
    }

    next();
};

// Middleware to get a connection from the pool
const getConnectionFromPool = (req, res, next) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        req.dbConnection = connection; // Attach the connection to the request object
        next();
    });
};

// Middleware to release the connection back to the pool
const releaseConnectionToPool = (req, res, next) => {
    if (req.dbConnection) {
        req.dbConnection.release();
    }
    next();
};

// Add Student
app.post('/addStudent', validateCommonFields, getConnectionFromPool, (req, res) => {
    const { name, dateOfBirth, gender } = req.body;
    const sql = 'INSERT INTO Student (Name, DateOfBirth, Gender) VALUES (?, ?, ?)';

    req.dbConnection.query(sql, [name, dateOfBirth, gender], (err, result) => {
        releaseConnectionToPool(req, res, () => {
            if (err) {
                console.error('Error adding student:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            res.send('Student added');
        });
    });
});

// Get All Students
app.get('/getAllStudents', getConnectionFromPool, (req, res) => {
    const sql = 'SELECT * FROM Student';

    req.dbConnection.query(sql, (err, results) => {
        releaseConnectionToPool(req, res, () => {
            if (err) {
                console.error('Error getting all students:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            res.send(results);
        });
    });
});

// Get Student by ID
app.get('/getStudent/:id', validateIdParam, getConnectionFromPool, (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM Student WHERE StudentId = ?';

    req.dbConnection.query(sql, [id], (err, result) => {
        releaseConnectionToPool(req, res, () => {
            if (err) {
                console.error('Error getting student by ID:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            if (result.length === 0) {
                return res.status(404).json({ error: 'Student not found' });
            }

            res.send(result[0]);
        });
    });
});

// Delete Student by ID
app.delete('/deleteStudent/:id', validateIdParam, getConnectionFromPool, (req, res) => {
    const { id } = req.params;
    const sql1 = 'DELETE FROM StudentCourse WHERE StudentId = ?';
    const sql2 = 'DELETE FROM Student WHERE StudentId = ?';

    req.dbConnection.query(sql1, [id], (err, result) => {
        releaseConnectionToPool(req, res, () => {
            if (err) {
                console.error('Error deleting student by ID:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Student not found' });
            }
            req.dbConnection.query(sql2, [id], (err, result) => {
                releaseConnectionToPool(req, res, () => {
                    if (err) {
                        console.error('Error deleting student by ID:', err);
                        return res.status(500).json({ error: 'Internal Server Error' });
                    }
        
                    if (result.affectedRows === 0) {
                        return res.status(404).json({ error: 'Student not found' });
                    }
        
                    res.send('Student deleted');
                });
            });
        });
    });

    
});

// Add Course
app.post('/addCourse', getConnectionFromPool, (req, res) => {
    const { course } = req.body;

    if (!course) {
        return res.status(400).json({ error: 'Course is a required field.' });
    }

    const sql = 'INSERT INTO Course (Course) VALUES (?)';

    req.dbConnection.query(sql, [course], (err, result) => {
        releaseConnectionToPool(req, res, () => {
            if (err) {
                console.error('Error adding course:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            res.send('Course added');
        });
    });
});

// Get All Courses
app.get('/getAllCourses', getConnectionFromPool, (req, res) => {
    const sql = 'SELECT * FROM Course';

    req.dbConnection.query(sql, (err, results) => {
        releaseConnectionToPool(req, res, () => {
            if (err) {
                console.error('Error getting all courses:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            res.send(results);
        });
    });
});

// Delete Course by ID
app.delete('/deleteCourse/:id', validateIdParam, getConnectionFromPool, (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM Course WHERE CourseId = ?';

    req.dbConnection.query(sql, [id], (err, result) => {
        releaseConnectionToPool(req, res, () => {
            if (err) {
                console.error('Error deleting course by ID:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Course not found' });
            }

            res.send('Course deleted');
        });
    });
});

// Assign Course to Student
app.post('/assignCourse', getConnectionFromPool, (req, res) => {
    const { studentId, courseId } = req.body;

    if (!studentId || isNaN(studentId) || !courseId || isNaN(courseId)) {
        return res.status(400).json({ error: 'Invalid studentId or courseId' });
    }

    const sql = 'INSERT INTO StudentCourse (StudentId, CourseId) VALUES (?, ?)';

    req.dbConnection.query(sql, [studentId, courseId], (err, result) => {
        releaseConnectionToPool(req, res, () => {
            if (err) {
                console.error('Error assigning course to student:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            res.send('Course assigned to student');
        });
    });
});

// ... (similar modifications for other API endpoints)

// Start the Express server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});