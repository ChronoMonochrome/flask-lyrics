// front/src/api.js

// Adjust this URL if your Docker setup uses a different port or hostname
// For local Docker development, use the service name 'web' and port 8011
// Or 'localhost' if running React directly and Flask via docker-compose
const API_BASE_URL = 'http://localhost:8011/api';

// Function to handle fetching data with optional authentication
async function apiFetch(endpoint, method = 'GET', body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method: method,
    headers: headers,
    body: body ? JSON.stringify(body) : null,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      // If the server responded with an error, throw it
      throw new Error(data.message || `API Error: ${response.status}`);
    }
    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error; // Re-throw to be caught by the calling component
  }
}

export const loginUser = async (username, password) => {
  console.log("Attempting login for:", username); // For debugging
  // Replace with actual API call
  // return apiFetch('/login', 'POST', { username, password });

  // --- MOCK LOGIN (REMOVE IN PRODUCTION) ---
  return new Promise(resolve => setTimeout(() => {
    if (username === 'test' && password === 'test') {
      console.log("MOCK LOGIN SUCCESS");
      resolve("mock_jwt_token_for_test_user"); // Simulate a token
    } else {
      console.log("MOCK LOGIN FAIL");
      throw new Error("Invalid username or password (MOCK)");
    }
  }, 500));
  // --- END MOCK LOGIN ---
};

export const registerUser = async (username, password, email) => {
  console.log("Attempting registration for:", username, email); // For debugging
  // Replace with actual API call
  // return apiFetch('/register', 'POST', { username, password, email });

  // --- MOCK REGISTER (REMOVE IN PRODUCTION) ---
  return new Promise(resolve => setTimeout(() => {
    if (username === 'newuser') {
      console.log("MOCK REGISTER FAIL: Username taken");
      throw new Error("Username already taken (MOCK)");
    } else {
      console.log("MOCK REGISTER SUCCESS");
      resolve({ message: "Registration successful (MOCK)" });
    }
  }, 500));
  // --- END MOCK REGISTER ---
};

export const getRiddles = async (token = null) => {
  console.log("Fetching riddles with token:", token ? "present" : "absent"); // For debugging
  // Replace with actual API call
  // return apiFetch('/riddles', 'GET', null, token);

  // --- MOCK RIDDLES (REMOVE IN PRODUCTION) ---
  return new Promise(resolve => setTimeout(() => {
    console.log("MOCK RIDDLES FETCHED");
    resolve([
      { id: 1, japanese_text: "朝には四本の足、昼には二本の足、夜には三本の足。これは何？", furigana: "あさにはよんほんのあし、ひるにはにほんのあし、よるにはさんぼんのあし。これはなに？", english_text: "What has four feet in the morning, two feet at noon, and three feet in the evening?", category: "Classic", difficulty: "Medium", answer: "人間" },
      { id: 2, japanese_text: "私は空を飛ぶが、翼はない。私は泣くが、目はない。私はどこへでも行くが、足はない。私は何？", furigana: "わたしはそらを飛ぶが、つばさはない。わたしは泣くが、めはない。わたしはどこへでも行くが、あしはない。わたしはなに？", english_text: "I fly without wings, I cry without eyes, I go anywhere without feet. What am I?", category: "Nature", difficulty: "Hard", answer: "雲" },
      { id: 3, japanese_text: "私は食べるほど大きくなり、水を飲むほど小さくなる。私は何？", furigana: "わたしはたべるほどおおきくなり、水を飲むほどちいさくなる。わたしはなに？", english_text: "The more I eat, the bigger I get. The more I drink, the smaller I get. What am I?", category: "Objects", difficulty: "Easy", answer: "火" }
    ]);
  }, 700));
  // --- END MOCK RIDDLES ---
};

export const submitAnswer = async (riddleId, userAnswer, token = null) => {
  console.log(`Submitting answer for riddle ${riddleId}: ${userAnswer}`); // For debugging
  // Replace with actual API call (you'll need a backend endpoint for this)
  // return apiFetch(`/riddles/${riddleId}/answer`, 'POST', { answer: userAnswer }, token);

  // --- MOCK SUBMIT ANSWER (REMOVE IN PRODUCTION) ---
  return new Promise(resolve => setTimeout(() => {
    console.log("MOCK ANSWER SUBMITTED");
    const mockAnswers = {
      1: "人間",
      2: "雲",
      3: "火"
    };
    const isCorrect = userAnswer.trim().toLowerCase() === mockAnswers[riddleId].toLowerCase();
    resolve({ correct: isCorrect, message: isCorrect ? "Correct!" : "Incorrect. Try again." });
  }, 300));
  // --- END MOCK SUBMIT ANSWER ---
};