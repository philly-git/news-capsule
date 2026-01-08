import fs from 'fs';
import path from 'path';

const FEEDBACK_FILE_PATH = path.join(process.cwd(), 'data', 'feedback.json');

// Ensure the data directory exists
const ensureDataDir = () => {
    const dir = path.dirname(FEEDBACK_FILE_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

export async function getFeedback() {
    ensureDataDir();
    if (!fs.existsSync(FEEDBACK_FILE_PATH)) {
        return [];
    }
    const fileContent = fs.readFileSync(FEEDBACK_FILE_PATH, 'utf8');
    try {
        return JSON.parse(fileContent);
    } catch (e) {
        return [];
    }
}

export async function saveFeedback(entry) {
    ensureDataDir();
    const currentFeedback = await getFeedback();

    const newEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...entry
    };

    currentFeedback.unshift(newEntry); // Add new entry to the top

    fs.writeFileSync(FEEDBACK_FILE_PATH, JSON.stringify(currentFeedback, null, 2), 'utf8');
    return newEntry;
}
