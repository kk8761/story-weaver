// --- Constants ---
const API_BASE_URL = '/api';
const STORY_LIST_ENDPOINT = `${API_BASE_URL}/stories`;
const CREATE_STORY_ENDPOINT = `${API_BASE_URL}/stories`;
const STORY_DETAIL_ENDPOINT_TEMPLATE = `${API_BASE_URL}/stories/:storyId`;
const ADD_TEXT_ENDPOINT_TEMPLATE = `${API_BASE_URL}/stories/:storyId/add`;
const AI_SUGGEST_ENDPOINT_TEMPLATE = `${API_BASE_URL}/stories/:storyId/ai-suggest`;
const REVERT_STORY_ENDPOINT_TEMPLATE = `${API_BASE_URL}/stories/:storyId/revert`;
const USER_PROFILE_ENDPOINT_TEMPLATE = `${API_BASE_URL}/users/:userId`; // Placeholder for future

const STORY_POLL_INTERVAL = 5000; // Poll for story updates every 5 seconds

// --- DOM Elements ---
const appContainer = document.querySelector('.container');
const header = document.querySelector('.main-header');
const logo = document.querySelector('.logo');
const mainNav = document.querySelector('.main-nav');
const showStoriesBtn = document.getElementById('show-stories-btn');
const createStoryBtn = document.getElementById('create-story-btn');
const storyListContainer = document.getElementById('story-list-container');
const storyViewContainer = document.getElementById('story-view-container');
const createStoryFormContainer = document.getElementById('create-story-form-container');
const addTextFormContainer = document.getElementById('add-text-form-container');
const aiSuggestionContainer = document.getElementById('ai-suggestion-container');
const versionHistoryContainer = document.getElementById('version-history-container');

let currentStoryId = null;
let storyPollTimer = null;

// --- Utility Functions ---

/**
 * Fetches data from a given API endpoint.
 * @param {string} url - The API endpoint URL.
 * @param {object} [options={}] - Fetch options (method, headers, body, etc.).
 * @returns {Promise<object>} - A promise that resolves with the JSON response.
 */
async function fetchData(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error(`API Error: ${response.status} - ${errorData.message || response.statusText}`);
            throw new Error(`API Error: ${errorData.message || response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Fetch Error:', error);
        throw error; // Re-throw to be caught by calling functions
    }
}

/**
 * Renders a message to the user.
 * @param {string} message - The message to display.
 * @param {string} type - The type of message ('info', 'error').
 */
function showMessage(message, type = 'info') {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;
    appContainer.insertBefore(messageElement, header.nextSibling);
    setTimeout(() => {
        messageElement.remove();
    }, 5000);
}

/**
 * Clears all content from the main view.
 */
function clearMainView() {
    storyListContainer.innerHTML = '';
    storyViewContainer.innerHTML = '';
    createStoryFormContainer.innerHTML = '';
    addTextFormContainer.innerHTML = '';
    aiSuggestionContainer.innerHTML = '';
    versionHistoryContainer.innerHTML = '';
    stopStoryPolling();
}

/**
 * Shows a specific section of the UI.
 * @param {HTMLElement} elementToShow - The element to make visible.
 */
function showSection(elementToShow) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    elementToShow.style.display = 'block';
}

/**
 * Formats a story snippet for display in the list.
 * @param {object} story - The story object.
 * @returns {string} - HTML string for the story snippet.
 */
function formatStorySnippet(story) {
    const narrativeSnippet = story.narrative.length > 0 ? story.narrative.join(' ') : 'No content yet.';
    return `
        <div class="story-item" data-story-id="${story.id}">
            <h3 class="story-title">${story.title}</h3>
            <p class="story-genre">Genre: ${story.genre || 'N/A'}</p>
            <p class="story-snippet">${narrativeSnippet.substring(0, 100)}${narrativeSnippet.length > 100 ? '...' : ''}</p>
        </div>
    `;
}

/**
 * Formats a narrative segment for display.
 * @param {string} segment - The narrative segment.
 * @param {number} index - The index of the segment.
 * @returns {string} - HTML string for the narrative segment.
 */
function formatNarrativeSegment(segment, index) {
    return `<p class="narrative-segment" data-index="${index}">${segment}</p>`;
}

/**
 * Renders the version history for a story.
 * @param {Array<Array<string>>} history - The array of narrative states.
 * @param {string} currentStoryId - The ID of the currently viewed story.
 */
function renderVersionHistory(history, currentStoryId) {
    versionHistoryContainer.innerHTML = '<h4>Version History</h4>';
    if (!history || history.length === 0) {
        versionHistoryContainer.innerHTML += '<p>No history available.</p>';
        return;
    }

    history.forEach((state, index) => {
        const stateSnippet = state.join(' ').substring(0, 50) + (state.join(' ').length > 50 ? '...' : '');
        const isCurrent = storyViewContainer.dataset.currentHistoryIndex === String(index);
        const revertButton = `
            <button class="revert-btn" data-history-index="${index}" data-story-id="${currentStoryId}" ${isCurrent ? 'disabled' : ''}>
                Revert to this version
            </button>
        `;
        versionHistoryContainer.innerHTML += `
            <div class="history-entry ${isCurrent ? 'current-version' : ''}">
                <p>Version ${index + 1}: ${stateSnippet}</p>
                ${revertButton}
            </div>
        `;
    });

    // Add event listeners to revert buttons
    versionHistoryContainer.querySelectorAll('.revert-btn').forEach(button => {
        button.addEventListener('click', handleRevertStory);
    });
}

/**
 * Starts polling for story updates.
 * @param {string} storyId - The ID of the story to poll.
 */
function startStoryPolling(storyId) {
    stopStoryPolling(); // Ensure no duplicate timers
    currentStoryId = storyId;
    console.log(`Starting polling for story: ${storyId}`);
    storyPollTimer = setInterval(() => fetchAndUpdateStory(storyId), STORY_POLL_INTERVAL);
    fetchAndUpdateStory(storyId); // Initial fetch
}

/**
 * Stops polling for story updates.
 */
function stopStoryPolling() {
    if (storyPollTimer) {
        console.log(`Stopping polling for story: ${currentStoryId}`);
        clearInterval(storyPollTimer);
        storyPollTimer = null;
        currentStoryId = null;
    }
}

// --- API Interaction Functions ---

/**
 * Fetches all stories and renders the list.
 */
async function fetchAndRenderStories() {
    clearMainView();
    showSection(storyListContainer);
    storyListContainer.innerHTML = '<p class="loading-message">Loading stories...</p>';
    try {
        const stories = await fetchData(STORY_LIST_ENDPOINT);
        storyListContainer.innerHTML = ''; // Clear loading message
        if (stories.length === 0) {
            storyListContainer.innerHTML = '<p>No stories found. Be the first to create one!</p>';
        } else {
            stories.forEach(story => {
                storyListContainer.innerHTML += formatStorySnippet(story);
            });
            // Add event listeners to story items
            document.querySelectorAll('.story-item').forEach(item => {
                item.addEventListener('click', () => {
                    const storyId = item.dataset.storyId;
                    fetchAndRenderStoryDetail(storyId);
                });
            });
        }
    } catch (error) {
        storyListContainer.innerHTML = '<p class="error-message">Failed to load stories.</p>';
        showMessage(`Error fetching stories: ${error.message}`, 'error');
    }
}

/**
 * Fetches details for a specific story and renders the view.
 * @param {string} storyId - The ID of the story to fetch.
 */
async function fetchAndRenderStoryDetail(storyId) {
    clearMainView();
    showSection(storyViewContainer);
    storyViewContainer.innerHTML = `<p class="loading-message">Loading story "${storyId}"...</p>`;

    try {
        const story = await fetchData(STORY_DETAIL_ENDPOINT_TEMPLATE.replace(':storyId', storyId));
        renderStoryDetail(story);
        startStoryPolling(storyId); // Start polling for updates
    } catch (error) {
        storyViewContainer.innerHTML = `<p class="error-message">Failed to load story "${storyId}".</p>`;
        showMessage(`Error loading story: ${error.message}`, 'error');
        // Optionally navigate back to story list
        setTimeout(fetchAndRenderStories, 2000);
    }
}

/**
 * Renders the detailed view of a story.
 * @param {object} story - The story object.
 */
function renderStoryDetail(story) {
    storyViewContainer.innerHTML = `
        <div class="story-detail">
            <h2 class="story-title">${story.title}</h2>
            <p class="story-genre">Genre: ${story.genre || 'N/A'}</p>
            <div class="narrative-content">
                ${story.narrative.map(formatNarrativeSegment).join('')}
            </div>
            <div id="add-text-form-container" class="form-container">
                <h3>Add to the Story</h3>
                <form id="add-text-form">
                    <textarea id="new-text-segment" rows="3" placeholder="Write your sentence or paragraph here..." required></textarea>
                    <button type="submit" class="action-btn">Add Segment</button>
                </form>
            </div>
            <div id="ai-suggestion-container" class="suggestion-container">
                <h4>AI Suggestions</h4>
                <button id="suggest-continuation-btn" class="action-btn secondary-btn">Suggest Next Sentence</button>
                <button id="suggest-plot-twist-btn" class="action-btn secondary-btn">Suggest Plot Twist</button>
                <div id="ai-response-area"></div>
            </div>
            <div id="version-history-container" class="history-container"></div>
        </div>
    `;

    // Store current history index for comparison
    storyViewContainer.dataset.currentHistoryIndex = String(story.history.length - 1);

    // Attach event listeners
    document.getElementById('add-text-form').addEventListener('submit', handleAddText);
    document.getElementById('suggest-continuation-btn').addEventListener('click', () => handleAiSuggestion('continuation'));
    document.getElementById('suggest-plot-twist-btn').addEventListener('click', () => handleAiSuggestion('plot_twist'));

    // Render version history
    renderVersionHistory(story.history, story.id);

    // Set current story ID for polling and other actions
    currentStoryId = story.id;
}

/**
 * Fetches the latest version of the story and updates the view.
 * @param {string} storyId - The ID of the story to fetch.
 */
async function fetchAndUpdateStory(storyId) {
    if (!storyId) return;
    console.log(`Polling for updates on story: ${storyId}`);
    try {
        const story = await fetchData(STORY_DETAIL_ENDPOINT_TEMPLATE.replace(':storyId', storyId));
        // Compare current narrative with fetched narrative to avoid unnecessary re-renders
        const currentNarrativeElements = storyViewContainer.querySelectorAll('.narrative-segment');
        const currentNarrativeCount = currentNarrativeElements.length;
        const fetchedNarrativeCount = story.narrative.length;

        // Simple check: if counts differ, or if the last segment is different, re-render
        let needsUpdate = false;
        if (currentNarrativeCount !== fetchedNarrativeCount) {
            needsUpdate = true;
        } else if (fetchedNarrativeCount > 0 && currentNarrativeCount > 0) {
            const lastSegmentText = story.narrative[fetchedNarrativeCount - 1];
            const lastDisplayedSegment = currentNarrativeElements[currentNarrativeCount - 1].textContent;
            if (lastSegmentText !== lastDisplayedSegment) {
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            console.log("Story updated, re-rendering view.");
            renderStoryDetail(story); // Re-render the entire detail view
        } else {
            console.log("Story content unchanged.");
        }
    } catch (error) {
        console.error(`Polling error for story ${storyId}:`, error);
        // Optionally show an error message or stop polling if errors persist
    }
}


/**
 * Handles the creation of a new story.
 * @param {Event} event - The form submission event.
 */
async function handleCreateStory(event) {
    event.preventDefault();
    const title = document.getElementById('story-title-input').value.trim();
    const genre = document.getElementById('story-genre-input').value.trim();
    const prompt = document.getElementById('story-prompt-input').value.trim();

    if (!title || !prompt) {
        showMessage('Title and initial prompt are required.', 'error');
        return;
    }

    try {
        const newStory = await fetchData(CREATE_STORY_ENDPOINT, {
            method: 'POST',
            body: JSON.stringify({ title, genre, prompt }),
        });
        showMessage(`Story "${title}" created successfully!`);
        fetchAndRenderStoryDetail(newStory.id); // Navigate to the new story
    } catch (error) {
        showMessage(`Failed to create story: ${error.message}`, 'error');
    }
}

/**
 * Handles adding a new text segment to the story.
 * @param {Event} event - The form submission event.
 */
async function handleAddText(event) {
    event.preventDefault();
    const textArea = document.getElementById('new-text-segment');
    const newText = textArea.value.trim();

    if (!newText) {
        showMessage('Please enter some text to add.', 'error');
        return;
    }
    if (!currentStoryId) {
        showMessage('No story is currently selected.', 'error');
        return;
    }

    try {
        await fetchData(ADD_TEXT_ENDPOINT_TEMPLATE.replace(':storyId', currentStoryId), {
            method: 'POST',
            body: JSON.stringify({ text: newText }),
        });
        textArea.value = ''; // Clear the textarea
        // The view will update via polling
        showMessage('Text segment added successfully!');
    } catch (error) {
        showMessage(`Failed to add text: ${error.message}`, 'error');
    }
}

/**
 * Handles requesting an AI suggestion.
 * @param {string} suggestionType - The type of suggestion ('continuation', 'plot_twist').
 */
async function handleAiSuggestion(suggestionType) {
    if (!currentStoryId) {
        showMessage('No story is currently selected.', 'error');
        return;
    }

    const aiResponseArea = document.getElementById('ai-response-area');
    aiResponseArea.innerHTML = '<p>Generating suggestion...</p>';

    try {
        const suggestion = await fetchData(AI_SUGGEST_ENDPOINT_TEMPLATE.replace(':storyId', currentStoryId), {
            method: 'POST',
            body: JSON.stringify({ type: suggestionType }),
        });

        let suggestionText = 'AI could not generate a suggestion.';
        if (suggestion && suggestion.text) {
            suggestionText = suggestion.text;
        } else if (suggestion && suggestion.continuation) {
            suggestionText = suggestion.continuation;
        } else if (suggestion && suggestion.plot_twist) {
            suggestionText = suggestion.plot_twist;
        }

        aiResponseArea.innerHTML = `
            <p><strong>AI ${suggestionType.replace('_', ' ')}:</strong></p>
            <p class="ai-suggestion-text">${suggestionText}</p>
            <button class="action-btn secondary-btn add-ai-suggestion">Add to Story</button>
        `;

        // Add event listener to the "Add to Story" button
        const addSuggestionBtn = aiResponseArea.querySelector('.add-ai-suggestion');
        addSuggestionBtn.addEventListener('click', () => {
            const textArea = document.getElementById('new-text-segment');
            if (textArea) {
                textArea.value = suggestionText; // Pre-fill the textarea
                aiResponseArea.innerHTML = ''; // Clear the response area
            }
        });

    } catch (error) {
        aiResponseArea.innerHTML = `<p class="error-message">Failed to get AI suggestion: ${error.message}</p>`;
        showMessage(`Error getting AI suggestion: ${error.message}`, 'error');
    }
}

/**
 * Handles reverting the story to a previous version.
 * @param {Event} event - The click event on a revert button.
 */
async function handleRevertStory(event) {
    const button = event.target;
    const storyId = button.dataset.storyId;
    const historyIndex = button.dataset.historyIndex;

    if (!storyId || historyIndex === undefined) {
        showMessage('Invalid revert action.', 'error');
        return;
    }

    try {
        await fetchData(REVERT_STORY_ENDPOINT_TEMPLATE.replace(':storyId', storyId), {
            method: 'POST',
            body: JSON.stringify({ historyIndex: parseInt(historyIndex, 10) }),
        });
        // The view will update via polling, but we can force a refresh
        fetchAndRenderStoryDetail(storyId);
        showMessage('Story reverted successfully!');
    } catch (error) {
        showMessage(`Failed to revert story: ${error.message}`, 'error');
    }
}

// --- UI Rendering Functions ---

/**
 * Renders the form for creating a new story.
 */
function renderCreateStoryForm() {
    clearMainView();
    showSection(createStoryFormContainer);
    createStoryFormContainer.innerHTML = `
        <div class="form-container">
            <h2>Create a New Story</h2>
            <form id="create-story-form">
                <div class="form-group">
                    <label for="story-title-input">Story Title</label>
                    <input type="text" id="story-title-input" placeholder="e.g., The Last Starship" required>
                </div>
                <div class="form-group">
                    <label for="story-genre-input">Genre (Optional)</label>
                    <input type="text" id="story-genre-input" placeholder="e.g., Sci-Fi, Fantasy">
                </div>
                <div class="form-group">
                    <label for="story-prompt-input">Initial Prompt</label>
                    <textarea id="story-prompt-input" rows="4" placeholder="Start your story here..." required></textarea>
                </div>
                <button type="submit" class="action-btn">Create Story</button>
            </form>
        </div>
    `;
    document.getElementById('create-story-form').addEventListener('submit', handleCreateStory);
}

// --- Event Listeners ---

// Navigation Button Listeners
showStoriesBtn.addEventListener('click', () => {
    fetchAndRenderStories();
});

createStoryBtn.addEventListener('click', () => {
    renderCreateStoryForm();
});

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Initially show the story list
    fetchAndRenderStories();
});