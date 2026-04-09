const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Data Storage (In-memory with persistence to data.json) ---
let stories = [];
let users = {}; // For future user profile implementation
const dataFilePath = path.join(__dirname, 'data.json');

// Load data from file on startup
const loadData = () => {
    if (fs.existsSync(dataFilePath)) {
        const data = fs.readFileSync(dataFilePath, 'utf-8');
        const parsedData = JSON.parse(data);
        stories = parsedData.stories || [];
        users = parsedData.users || {};
    }
};

// Save data to file
const saveData = () => {
    const data = JSON.stringify({ stories, users }, null, 2);
    fs.writeFileSync(dataFilePath, data, 'utf-8');
};

loadData(); // Load data when the server starts

// --- Middleware ---
app.use(cors()); // Enable CORS for all origins
app.use(express.json()); // Parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from the 'public' directory

// --- API Endpoints ---

// GET /api/stories - Retrieve a list of all available stories
app.get('/api/stories', (req, res) => {
    const storyList = stories.map(story => ({
        id: story.id,
        title: story.title,
        genre: story.genre,
        snippet: story.narrative.length > 0 ? story.narrative.join(' ').substring(0, 100) + '...' : 'No content yet.'
    }));
    res.json(storyList);
});

// GET /api/stories/:storyId - Retrieve a specific story by its ID
app.get('/api/stories/:storyId', (req, res) => {
    const { storyId } = req.params;
    const story = stories.find(s => s.id === storyId);

    if (!story) {
        return res.status(404).json({ message: 'Story not found' });
    }
    res.json(story);
});

// POST /api/stories - Create a new story
app.post('/api/stories', (req, res) => {
    const { title, genre, initialPrompt } = req.body;

    if (!title || !genre || !initialPrompt) {
        return res.status(400).json({ message: 'Title, genre, and initial prompt are required to create a story.' });
    }

    const newStory = {
        id: uuidv4(),
        title: title,
        genre: genre,
        narrative: [initialPrompt], // Start with the initial prompt
        history: [[initialPrompt]], // Initial state in history
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    stories.push(newStory);
    saveData(); // Save after creating a new story
    res.status(201).json(newStory);
});

// POST /api/stories/:storyId/add - Add a new piece of text to the current story
app.post('/api/stories/:storyId/add', (req, res) => {
    const { storyId } = req.params;
    const { text } = req.body;

    if (!text) {
        return res.status(400).json({ message: 'Text content is required to add to the story.' });
    }

    const storyIndex = stories.findIndex(s => s.id === storyId);

    if (storyIndex === -1) {
        return res.status(404).json({ message: 'Story not found' });
    }

    // Save current narrative state to history before adding new text
    stories[storyIndex].history.push([...stories[storyIndex].narrative]);

    // Add the new text
    stories[storyIndex].narrative.push(text);
    stories[storyIndex].updatedAt = new Date().toISOString();

    saveData(); // Save after updating the story
    res.json(stories[storyIndex]);
});

// POST /api/stories/:storyId/ai-suggest - Request an AI-generated suggestion
app.post('/api/stories/:storyId/ai-suggest', (req, res) => {
    const { storyId } = req.params;
    const { promptType = 'continuation' } = req.body; // e.g., 'continuation', 'plot_twist', 'character_action'

    const storyIndex = stories.findIndex(s => s.id === storyId);

    if (storyIndex === -1) {
        return res.status(404).json({ message: 'Story not found' });
    }

    const currentNarrative = stories[storyIndex].narrative.join(' ');

    // --- AI Simulation ---
    // In a real application, this would involve calling an AI model (e.g., OpenAI API)
    // For this example, we'll generate a simple, deterministic suggestion.
    let suggestion = '';
    switch (promptType) {
        case 'plot_twist':
            suggestion = "Suddenly, a mysterious stranger appeared, holding an ancient map.";
            break;
        case 'character_action':
            suggestion = "The brave knight drew their sword and charged towards the dragon.";
            break;
        case 'continuation':
        default:
            suggestion = "The sun dipped below the horizon, casting long shadows across the land.";
            break;
    }

    // Add a bit of randomness based on narrative length for variety
    const randomFactor = currentNarrative.length % 5;
    const randomContinuations = [
        " A chilling wind swept through the trees.",
        " A distant sound echoed, breaking the silence.",
        " Little did they know, their adventure was just beginning.",
        " The air grew heavy with anticipation.",
        " A single tear rolled down their cheek."
    ];
    suggestion += randomContinuations[randomFactor];
    // --- End AI Simulation ---

    res.json({ suggestion: suggestion, promptType: promptType });
});

// POST /api/stories/:storyId/revert - Revert the story to a previous state
app.post('/api/stories/:storyId/revert', (req, res) => {
    const { storyId } = req.params;
    const { historyIndex } = req.body; // The index in the history array to revert to

    if (historyIndex === undefined || historyIndex < 0) {
        return res.status(400).json({ message: 'Valid history index is required for reversion.' });
    }

    const storyIndex = stories.findIndex(s => s.id === storyId);

    if (storyIndex === -1) {
        return res.status(404).json({ message: 'Story not found' });
    }

    if (historyIndex >= stories[storyIndex].history.length) {
        return res.status(400).json({ message: 'History index out of bounds.' });
    }

    // Revert narrative to the selected history state
    stories[storyIndex].narrative = [...stories[storyIndex].history[historyIndex]];

    // Optionally, trim history to the reverted point to prevent future edits from appearing "out of order"
    // stories[storyIndex].history = stories[storyIndex].history.slice(0, historyIndex + 1);

    stories[storyIndex].updatedAt = new Date().toISOString();

    saveData(); // Save after reverting
    res.json(stories[storyIndex]);
});

// GET /api/users/:userId - Retrieve user profile (placeholder)
app.get('/api/users/:userId', (req, res) => {
    const { userId } = req.params;
    const user = users[userId];

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    // In a real app, this would return user details and followed stories
    res.json({
        id: user.id,
        username: user.username,
        followedStories: user.followedStories || []
    });
});

// --- Catch-all for Frontend Routing ---
// Serve index.html for any other GET requests that don't match API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Story Weaver server running on http://localhost:${PORT}`);
});