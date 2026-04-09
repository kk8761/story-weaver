# Story Weaver: Collaborative Fiction Generator

## Project Overview

Story Weaver is a dynamic web application that empowers users to collaboratively build fictional narratives. It combines real-time multi-user editing with AI-driven suggestions for plot twists, character actions, and story continuations. Users can define initial prompts, select genres, track story versions, and even follow their favorite ongoing tales.

## Features

*   **Real-time Collaborative Editing:** Multiple users can contribute to a single story simultaneously.
*   **AI-Powered Suggestions:** Get AI-generated ideas for continuing the story, introducing plot twists, or developing characters.
*   **User-Defined Prompts & Genres:** Start stories with custom prompts and categorize them by genre.
*   **Version History:** Track changes and revert to previous states of the narrative.
*   **User Profiles & Following:** (Future Feature) Manage user profiles and follow stories of interest.

## Architecture

*   **Frontend:** HTML, CSS (Vanilla JS)
*   **Backend:** Node.js, Express.js
*   **Storage:** In-memory JSON objects with persistence to `data.json` for stories and user data. Version history is embedded within story objects.
*   **Dependencies:** `express`, `cors`, `uuid`

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/AgenticStudio/story-weaver.git
    cd story-weaver
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the development server:**
    ```bash
    npm run dev
    ```
    This will start the server using `nodemon` for automatic restarts on file changes.

4.  **Access the application:**
    Open your web browser and navigate to `http://localhost:3000`.

## API Endpoints

All API endpoints are prefixed with `/api`.

| Method | Path                         | Purpose                                                        | Response                                                                        |
| :----- | :--------------------------- | :------------------------------------------------------------- | :------------------------------------------------------------------------------ |
| GET    | `/api/stories`               | Retrieve a list of all available stories.                      | JSON array of story objects (ID, title, snippet).                               |
| GET    | `/api/stories/:storyId`      | Retrieve a specific story by ID (full narrative, history).     | JSON object: `id`, `title`, `genre`, `narrative` (array), `history` (array).    |
| POST   | `/api/stories`               | Create a new story with initial prompt and genre.              | JSON object of the newly created story (including ID).                          |
| POST   | `/api/stories/:storyId/add`  | Add a new text segment to the current story.                   | JSON object of the updated story.                                               |
| POST   | `/api/stories/:storyId/ai-suggest` | Request an AI-generated suggestion for the story.          | JSON object containing the AI suggestion (e.g., `continuation`, `plot_twist`). |
| POST   | `/api/stories/:storyId/revert` | Revert the story to a previous state from its version history. | JSON object of the reverted story.                                              |
| GET    | `/api/users/:userId`         | Retrieve user profile and followed stories (Placeholder).      | JSON object with user details and followed story IDs.                           |

## Data Model

### Story Object

```json
{
  "id": "uuid-string",
  "title": "string",
  "genre": "string",
  "narrative": [
    "string (segment 1)",
    "string (segment 2)",
    ...
  ],
  "history": [
    [
      "string (previous segment 1)",
      "string (previous segment 2)",
      ...
    ],
    ...
  ]
}
```

### User Object (Placeholder)

```json
{
  "userId": "uuid-string",
  "username": "string",
  "followedStories": [
    "storyId-1",
    "storyId-2",
    ...
  ]
}
```

## Development Notes

*   The backend uses in-memory storage which is persisted to `data.json` on server shutdown or periodically. For production, a robust database solution would be recommended.
*   AI suggestion endpoints (`/api/stories/:storyId/ai-suggest`) are currently placeholders and do not implement actual AI logic. Integration with an AI model (like OpenAI's GPT) would be required here.
*   User profile and following features are planned but not fully implemented in this initial version.
*   Frontend uses polling (`STORY_POLL_INTERVAL`) to check for story updates. For a more efficient real-time experience, WebSockets would be a suitable technology.

## Contribution

Contributions are welcome! Please feel free to submit pull requests or open issues.

## License

This project is licensed under the MIT License.