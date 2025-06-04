require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

const uri = "mongodb+srv://anthonyventura2324:36kgQwCf6zqWEiDa@smartkidstutoring.jahng0c.mongodb.net/SmartKidsTutoring?retryWrites=true&w=majority";
const dbName = "SmartKidsTutoring";

if (!uri) {
    console.error("❌ MONGODB_URI environment variable not set!");
    process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'Frontend')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Mongo Client
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Database connection
let db;
async function connectDB() {
    try {
        await client.connect();
        db = client.db(dbName);
        console.log("✅ Connected to MongoDB!");

        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        if (!collectionNames.includes('tutors')) {
            await db.createCollection('tutors');
            console.log("Created 'tutors' collection");
        }

        if (!collectionNames.includes('users')) {
            await db.createCollection('users');
            console.log("Created 'users' collection");
        }

        if (!collectionNames.includes('enrollments')) {
            await db.createCollection('enrollments');
            console.log("Created 'enrollments' collection");
        }

        if (!collectionNames.includes('officehours')) {
            await db.createCollection('officehours');
            console.log("Created 'officehours' collection");
            
            // Create indexes for better query performance
            await db.collection('officehours').createIndex({ tutorUsername: 1 });
            await db.collection('officehours').createIndex({ day: 1, startTime: 1 });
        }

    } catch (err) {
        console.error("❌ MongoDB connection failed:", err);
    }
}
connectDB();

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Frontend', 'Homepage.html'));
});

// Serve tutor dashboard
app.get('/tutor-dashboard', (req, res) => {
    // In a real app, you would verify the user's session here
    const tutorUsername = req.session?.tutorUsername; // This would come from your session
    res.sendFile(path.join(__dirname, 'Frontend', 'tutor_dashboard.html'));
});

// Unified Login Route
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        let user = await db.collection("users").findOne({ email });
        let userType = 'student';

        if (!user) {
            user = await db.collection("tutors").findOne({ email });
            userType = 'tutor';
        }

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const response = {
            message: 'Login successful!',
            username: user.username,
            userType: userType
        };

        if (userType === 'tutor') {
            // For tutors, redirect to the tutor dashboard with the username in the URL
            response.redirect = `/tutor-dashboard?username=${encodeURIComponent(user.username)}`;
        } else {
            // For students, use the regular dashboard
            response.redirect = 'student_dashboard.html';
        }

        res.status(200).json(response);

    } catch (err) {
        console.error("Error during login:", err);
        res.status(500).json({ message: 'Server error. Please try again later.' });
    }
});

// Student Signup Route
app.post('/api/signup', async (req, res) => {
    const { name, email, username, password } = req.body;

    if (!name || !email || !username || !password) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        const existingUser = await db.collection("users").findOne({
            $or: [{ username }, { email }]
        });

        if (existingUser) {
            return res.status(409).json({
                message: existingUser.username === username
                    ? 'Username already exists'
                    : 'Email already registered'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.collection("users").insertOne({
            name,
            email,
            username,
            password: hashedPassword,
            role: 'student',
            createdAt: new Date(),
            tutorUsername: null
        });

        res.status(201).json({ message: 'Student account created successfully!' });
    } catch (err) {
        console.error("Error creating student account:", err);
        res.status(500).json({ message: 'Server error. Try again later.' });
    }
});

// Tutor Registration Route
app.post('/api/tutors', async (req, res) => {
    const { name, email, username, password, subject, availability, message } = req.body;

    if (!name || !email || !username || !password) {
        return res.status(400).json({ message: 'All required fields must be filled.' });
    }

    try {
        const existingTutor = await db.collection("tutors").findOne({
            $or: [{ username }, { email }]
        });

        if (existingTutor) {
            return res.status(409).json({
                message: existingTutor.username === username
                    ? 'Username already exists'
                    : 'Email already registered'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.collection("tutors").insertOne({
            name,
            email,
            username,
            password: hashedPassword,
            subject,
            availability,
            message,
            role: 'tutor',
            createdAt: new Date(),
            students: [] // Start with no enrolled students
        });

        res.status(201).json({ message: 'Tutor account created successfully!' });
    } catch (err) {
        console.error("Error saving tutor application:", err);
        res.status(500).json({ message: 'Server error. Try again later.' });
    }
});

// NEW: Tutor searches for student
app.get('/api/search-student/:username', async (req, res) => {
    const { username } = req.params;
    try {
        const student = await db.collection('users').findOne({ username });
        if (!student) return res.status(404).json({ message: 'Student not found' });

        res.status(200).json({
            name: student.name,
            username: student.username,
            email: student.email,
            tutorUsername: student.tutorUsername || null
        });
    } catch (err) {
        console.error("Error searching for student:", err); // Added error logging
        res.status(500).json({ message: 'Server error' });
    }
});

// NEW: Tutor enrolls student
app.post('/api/enroll-student', async (req, res) => {
    const { tutorUsername, studentUsername } = req.body;
    console.log('➡️ /api/enroll-student called with:', { tutorUsername, studentUsername });

    try {
        let tutor = await db.collection('tutors').findOne({ username: tutorUsername }); // Changed 'const' to 'let'
        console.log('🔍 Found tutor:', tutor);
        const student = await db.collection('users').findOne({ username: studentUsername });
        console.log('🔍 Found student:', student);

        if (!tutor || !student) {
            console.log('❌ Tutor or student not found in database.');
            return res.status(404).json({ message: 'Tutor or student not found' });
        }

        if (student.tutorUsername) {
            console.log('⚠️ Student is already enrolled with:', student.tutorUsername);
            return res.status(400).json({ message: 'This student is already enrolled with another tutor.' });
        }

        const existingEnrollment = await db.collection('enrollments').findOne({ tutorUsername: tutorUsername, studentUsername: studentUsername });
        console.log('📝 Existing enrollment:', existingEnrollment);
        if (existingEnrollment) {
            return res.status(409).json({ message: 'Student is already enrolled by this tutor.' });
        }

        // More robust check to ensure tutor.students is an array before checking length
        if (!tutor || !tutor.students || !Array.isArray(tutor.students)) {
            console.log('⚠️ Tutor object or tutor.students is undefined or not an array. Initializing to empty array.');
            await db.collection('tutors').updateOne(
                { username: tutorUsername },
                { $set: { students: [] } }
            );
            const updatedTutor = await db.collection('tutors').findOne({ username: tutorUsername });
            tutor = updatedTutor; // Now this assignment is valid because 'tutor' is 'let'
        }

        if (tutor.students && tutor.students.length >= 3) {
            console.log('🛑 Tutor has reached enrollment limit.');
            return res.status(400).json({ message: 'Tutor has already enrolled 3 students.' });
        }

        // Update tutor's student list (for potential quick access)
        const updateTutorResult = await db.collection('tutors').updateOne(
            { username: tutorUsername },
            { $push: { students: studentUsername } }
        );
        console.log('⬆️ Updated tutor result:', updateTutorResult);

        // Update student's tutor assignment
        const updateStudentResult = await db.collection('users').updateOne(
            { username: studentUsername },
            { $set: { tutorUsername: tutorUsername } }
        );
        console.log('⬆️ Updated student result:', updateStudentResult);

        // Create an enrollment record
        const insertEnrollmentResult = await db.collection('enrollments').insertOne({ tutorUsername, studentUsername, enrollmentDate: new Date() });
        console.log('➕ Created enrollment record:', insertEnrollmentResult.insertedId);

        res.status(200).json({ message: 'Student enrolled successfully!' });

    } catch (err) {
        console.error("🔥 Error enrolling student:", err);
        res.status(500).json({ message: 'Server error' });
    }
});

// NEW: Get tutor's students
app.get('/api/tutor-students/:tutorUsername', async (req, res) => {
    const { tutorUsername } = req.params;
    try {
        const tutor = await db.collection('tutors').findOne({ username: tutorUsername });
        if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

        // Fetch students from the 'users' collection where their username is in the tutor's 'students' array
        const students = await db.collection('users').find({ username: { $in: tutor.students || [] } }).toArray(); // Added null check for tutor.students
        res.status(200).json({ students });
    } catch (err) {
        console.error("Error fetching tutor's students:", err); // Added error logging
        res.status(500).json({ message: 'Server error' });
    }
});

// Add a route to list all routes for debugging
app.get('/api/routes', (req, res) => {
    const routes = [];
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            routes.push({
                path: middleware.route.path,
                methods: Object.keys(middleware.route.methods)
            });
        } else if (middleware.name === 'router') {
            middleware.handle.stack.forEach((handler) => {
                if (handler.route) {
                    routes.push({
                        path: handler.route.path,
                        methods: Object.keys(handler.route.methods)
                    });
                }
            });
        }
    });
    res.json(routes);
});

// Remove student enrollment
app.post('/api/remove-student', async (req, res) => {
    console.log('Remove student endpoint hit');
    const { tutorUsername, studentUsername } = req.body;
    console.log('➡️ /api/remove-student called with:', { tutorUsername, studentUsername });

    try {
        // Remove the enrollment record
        const deleteResult = await db.collection('enrollments').deleteOne({
            tutorUsername: tutorUsername,
            studentUsername: studentUsername
        });

        if (deleteResult.deletedCount === 0) {
            console.log('⚠️ No enrollment found to delete');
            return res.status(404).json({ success: false, message: 'Enrollment not found' });
        }

        // Remove student from tutor's students array
        await db.collection('tutors').updateOne(
            { username: tutorUsername },
            { $pull: { students: studentUsername } }
        );

        // Remove tutor from student's document
        await db.collection('users').updateOne(
            { username: studentUsername },
            { $unset: { tutorUsername: "" } }
        );

        console.log('✅ Successfully removed enrollment');
        res.status(200).json({ success: true, message: 'Student removed successfully' });
    } catch (err) {
        console.error('🔥 Error removing student enrollment:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// NEW: Get student's tutor
app.get('/api/student-tutor/:studentUsername', async (req, res) => {
    const { studentUsername } = req.params;
    try {
        const student = await db.collection('users').findOne({ username: studentUsername });
        if (!student || !student.tutorUsername) {
            return res.status(404).json({ message: 'Tutor not assigned yet' });
        }

        const tutor = await db.collection('tutors').findOne({ username: student.tutorUsername });
        if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

        res.status(200).json({
            name: tutor.name,
            email: tutor.email,
            subject: tutor.subject,
            availability: tutor.availability,
            message: tutor.message
        });
    } catch (err) {
        console.error("Error fetching student's tutor:", err); // Added error logging
        res.status(500).json({ message: 'Server error' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        database: db ? 'Connected' : 'Disconnected',
        collections: {
            users: true,
            tutors: true,
            enrollments: true // Ensure 'enrollments' is in the health check
        }
    });
});

// Office Hours Endpoints

// Get office hours for a tutor
app.get('/api/get-office-hours', async (req, res) => {
    const { tutorUsername } = req.query;
    console.log('Received request for tutor:', tutorUsername);
    
    if (!tutorUsername) {
        console.error('No tutor username provided');
        return res.status(400).json({ success: false, message: 'Tutor username is required' });
    }
    
    try {
        console.log('Querying office hours for tutor:', tutorUsername);
        
        // Get all office hours for this tutor
        const officeHours = await db.collection('officehours')
            .find({ tutorUsername })
            .sort({ startTime: 1 })
            .toArray();
            
        console.log('Found office hours:', JSON.stringify(officeHours, null, 2));
            
        // Convert MongoDB _id to string for the frontend
        const formattedOfficeHours = officeHours.map(oh => {
            const formatted = {
                ...oh,
                _id: oh._id.toString()
            };
            console.log('Formatted office hour:', JSON.stringify(formatted, null, 2));
            return formatted;
        });
            
        const response = { 
            success: true, 
            officeHours: formattedOfficeHours 
        };
        
        console.log('Sending response:', JSON.stringify(response, null, 2));
        res.status(200).json(response);
    } catch (error) {
        console.error('Error fetching office hours:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error',
            error: error.message 
        });
    }
});

// Save office hours for a tutor
app.post('/api/save-office-hours', async (req, res) => {
    console.log('Received save-office-hours request with body:', req.body);
    const { tutorUsername, days, startTime, endTime, timezone } = req.body;
    
    if (!tutorUsername || !days || !days.length || !startTime || !endTime || !timezone) {
        console.log('Validation failed - missing fields:', { tutorUsername, days, startTime, endTime, timezone });
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    
    try {
        // Check if the tutor exists
        console.log('Looking up tutor:', tutorUsername);
        const tutor = await db.collection('tutors').findOne({ username: tutorUsername });
        if (!tutor) {
            console.log('Tutor not found:', tutorUsername);
            return res.status(404).json({ success: false, message: 'Tutor not found' });
        }
        
        // Create a single document with all selected days
        const officeHoursDoc = {
            tutorUsername,
            days,
            startTime,
            endTime,
            timezone,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        console.log('Attempting to insert new office hours:', JSON.stringify(officeHoursDoc, null, 2));
        
        try {
            // First, check if there are any existing office hours for this tutor with the same time range
            await db.collection('officehours').deleteMany({
                tutorUsername,
                startTime,
                endTime,
                timezone
            });
            
            // Insert the new office hours
            const result = await db.collection('officehours').insertOne(officeHoursDoc);
            console.log('Insert result:', result);
            
            if (!result.insertedId) {
                throw new Error('Failed to insert office hours');
            }
            
            // Get the inserted office hours and convert _id to string
            const insertedOfficeHours = await db.collection('officehours')
                .findOne({ _id: result.insertedId });
                
            console.log('Retrieved inserted office hours:', JSON.stringify(insertedOfficeHours, null, 2));
            
            // Convert _id to string for the frontend
            const formattedOfficeHours = {
                ...insertedOfficeHours,
                _id: insertedOfficeHours._id.toString()
            };
            
            res.status(200).json({ 
                success: true, 
                message: 'Office hours saved successfully',
                officeHours: [formattedOfficeHours]
            });
        } catch (dbError) {
            console.error('Database error during office hours insertion:', dbError);
            throw dbError; // This will be caught by the outer try-catch
        }
    } catch (error) {
        console.error('Error saving office hours:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Remove office hour
app.post('/api/remove-office-hour', async (req, res) => {
    const { id, tutorUsername } = req.body;
    
    if (!id || !tutorUsername) {
        return res.status(400).json({ success: false, message: 'ID and tutor username are required' });
    }
    
    try {
        // Verify the office hour belongs to the tutor
        let objectId;
        try {
            objectId = new ObjectId(id);
        } catch (error) {
            console.error('Invalid ID format:', id);
            return res.status(400).json({ success: false, message: 'Invalid office hour ID' });
        }
        
        const officeHour = await db.collection('officehours').findOne({ _id: objectId });
        
        if (!officeHour) {
            return res.status(404).json({ success: false, message: 'Office hour not found' });
        }
        
        if (officeHour.tutorUsername !== tutorUsername) {
            return res.status(403).json({ success: false, message: 'Not authorized to remove this office hour' });
        }
        
        // Delete the office hour
        const result = await db.collection('officehours').deleteOne({ _id: objectId });
        
        if (result.deletedCount === 0) {
            throw new Error('Failed to delete office hour');
        }
        
        res.status(200).json({ 
            success: true, 
            message: 'Office hour removed successfully' 
        });
    } catch (error) {
        console.error('Error removing office hour:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get office hours for a student's tutor
app.get('/api/student-office-hours', async (req, res) => {
    const { studentUsername } = req.query;
    
    if (!studentUsername) {
        return res.status(400).json({ success: false, message: 'Student username is required' });
    }
    
    try {
        // Get the student's tutor
        const student = await db.collection('users').findOne({ username: studentUsername });
        if (!student || !student.tutorUsername) {
            return res.status(404).json({ success: false, message: 'Student or tutor not found' });
        }
        
        // Get office hours for the student's tutor
        const officeHours = await db.collection('officehours')
            .find({ tutorUsername: student.tutorUsername })
            .sort({ day: 1, startTime: 1 })
            .toArray();
        
        res.status(200).json({
            success: true,
            officeHours
        });
    } catch (error) {
        console.error('Error fetching student tutor office hours:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.status(200).json({ success: true, message: 'Server is running' });
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});

process.on('SIGINT', async () => {
    try {
        await client.close();
        console.log('MongoDB connection closed');
        process.exit(0);
    } catch (err) {
        console.error('Error closing MongoDB connection:', err);
        process.exit(1);
    }
});
