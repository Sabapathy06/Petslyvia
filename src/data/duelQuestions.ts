export interface DuelQuestion {
  id: string;
  wallNumber: number;
  title: string;
  question: string;
  codeSnippet?: string;
  options: { label: string; isCorrect: boolean }[];
  explanation: string;
}

export interface QuestionSet {
  id: string;
  name: string;
  icon: string;
  badge: string;
  description: string;
  questions: DuelQuestion[];
}

export const QUESTION_SETS: QuestionSet[] = [
  {
    id: 'python_basics',
    name: 'Python Essentials',
    icon: '🐍',
    badge: 'Beginner',
    description: 'Core Python syntax, print formatting, list manipulation, and loops.',
    questions: [
      {
        id: 'py_1',
        wallNumber: 1,
        title: 'Barrier 1: Printing Output',
        question: 'Which function outputs text to the standard console in Python?',
        codeSnippet: '# Output text to console\n???("Hello, Petslyvia!")',
        options: [
          { label: 'echo("Hello, Petslyvia!")', isCorrect: false },
          { label: 'print("Hello, Petslyvia!")', isCorrect: true },
          { label: 'console.log("Hello, Petslyvia!")', isCorrect: false },
          { label: 'System.out.println("Hello, Petslyvia!")', isCorrect: false },
        ],
        explanation: 'print() is Python standard built-in function to display text to the console.',
      },
      {
        id: 'py_2',
        wallNumber: 2,
        title: 'Barrier 2: List Append',
        question: 'How do you add an element to the end of a list named pets?',
        codeSnippet: 'pets = ["cat", "dog"]\npets.???("fox")',
        options: [
          { label: 'pets.push("fox")', isCorrect: false },
          { label: 'pets.add("fox")', isCorrect: false },
          { label: 'pets.append("fox")', isCorrect: true },
          { label: 'pets.insert_end("fox")', isCorrect: false },
        ],
        explanation: 'append() is the standard method in Python to add an item to the end of a list.',
      },
      {
        id: 'py_3',
        wallNumber: 3,
        title: 'Barrier 3: List Slicing',
        question: 'What is the output of values[1:3] for values = [10, 20, 30, 40]?',
        codeSnippet: 'values = [10, 20, 30, 40]\nprint(values[1:3])',
        options: [
          { label: '[10, 20]', isCorrect: false },
          { label: '[20, 30]', isCorrect: true },
          { label: '[20, 30, 40]', isCorrect: false },
          { label: '[10, 20, 30]', isCorrect: false },
        ],
        explanation: 'Slicing values[1:3] takes elements from index 1 up to (but not including) index 3: [20, 30].',
      },
      {
        id: 'py_4',
        wallNumber: 4,
        title: 'Barrier 4: String Interpolation',
        question: 'What prefix enables formatted f-strings in Python 3.6+?',
        codeSnippet: 'name = "Sparky"\nmsg = ???f"Your pet is {name}"',
        options: [
          { label: 's', isCorrect: false },
          { label: 'f', isCorrect: true },
          { label: '$', isCorrect: false },
          { label: '@', isCorrect: false },
        ],
        explanation: 'Prefixing string literals with f (e.g. f"Hello {name}") creates an interpolated f-string.',
      },
      {
        id: 'py_5',
        wallNumber: 5,
        title: 'Barrier 5: Dictionary Keys',
        question: 'Which method retrieves a dictionary value safely without throwing a KeyError?',
        codeSnippet: 'stats = {"xp": 100, "level": 2}\nxp = stats.???("xp", 0)',
        options: [
          { label: 'stats.fetch("xp", 0)', isCorrect: false },
          { label: 'stats.get("xp", 0)', isCorrect: true },
          { label: 'stats.find("xp", 0)', isCorrect: false },
          { label: 'stats.lookup("xp", 0)', isCorrect: false },
        ],
        explanation: 'dict.get(key, default) returns the value if the key exists, or the fallback default if missing.',
      },
    ],
  },
  {
    id: 'js_mastery',
    name: 'JavaScript & Web',
    icon: '⚡',
    badge: 'Intermediate',
    description: 'ES6+ syntax, asynchronous promises, closures, and DOM manipulation.',
    questions: [
      {
        id: 'js_1',
        wallNumber: 1,
        title: 'Barrier 1: Const Reassignment',
        question: 'What happens when you attempt to reassign a primitive variable declared with const?',
        codeSnippet: 'const maxSpeed = 100;\nmaxSpeed = 120;',
        options: [
          { label: 'It updates silently', isCorrect: false },
          { label: 'Throws a TypeError: Assignment to constant variable', isCorrect: true },
          { label: 'It creates a new local variable', isCorrect: false },
          { label: 'It converts to undefined', isCorrect: false },
        ],
        explanation: 'const identifiers cannot be reassigned after declaration and will throw a TypeError at runtime.',
      },
      {
        id: 'js_2',
        wallNumber: 2,
        title: 'Barrier 2: Strict Equality',
        question: 'What is the return value of 0 === false in JavaScript?',
        codeSnippet: 'console.log(0 === false);',
        options: [
          { label: 'true', isCorrect: false },
          { label: 'false', isCorrect: true },
          { label: 'NaN', isCorrect: false },
          { label: 'TypeError', isCorrect: false },
        ],
        explanation: '=== checks both type and value. 0 is a number and false is a boolean, so strict equality is false.',
      },
      {
        id: 'js_3',
        wallNumber: 3,
        title: 'Barrier 3: Array Transformation',
        question: 'Which array method transforms every item into a new array of the same length?',
        codeSnippet: 'const nums = [1, 2, 3];\nconst doubled = nums.???((n) => n * 2);',
        options: [
          { label: 'nums.forEach(...)', isCorrect: false },
          { label: 'nums.filter(...)', isCorrect: false },
          { label: 'nums.map(...)', isCorrect: true },
          { label: 'nums.reduce(...)', isCorrect: false },
        ],
        explanation: 'Array.prototype.map() returns a brand new array populated with the results of calling the function on every item.',
      },
      {
        id: 'js_4',
        wallNumber: 4,
        title: 'Barrier 4: Asynchronous Await',
        question: 'The await keyword can only be used directly inside which type of function?',
        codeSnippet: '??? function fetchPetData() {\n  const res = await api.getPet();\n}',
        options: [
          { label: 'sync', isCorrect: false },
          { label: 'async', isCorrect: true },
          { label: 'static', isCorrect: false },
          { label: 'defer', isCorrect: false },
        ],
        explanation: 'await pauses execution until a Promise settles and is valid inside async functions.',
      },
      {
        id: 'js_5',
        wallNumber: 5,
        title: 'Barrier 5: Object Spread Operator',
        question: 'What is the spread syntax to clone pet and override its energy to 100?',
        codeSnippet: 'const pet = { name: "Sparky", energy: 40 };\nconst refreshed = { ???, energy: 100 };',
        options: [
          { label: '...pet', isCorrect: true },
          { label: 'clone(pet)', isCorrect: false },
          { label: 'pet.*', isCorrect: false },
          { label: '&pet', isCorrect: false },
        ],
        explanation: 'The object spread syntax {...pet, energy: 100} shallow copies all keys and overrides energy.',
      },
    ],
  },
  {
    id: 'dsa_algorithms',
    name: 'Algorithms & Logic',
    icon: '🧠',
    badge: 'Competitive',
    description: 'Time complexity, BFS/DFS pathfinding, data structures, and sorting.',
    questions: [
      {
        id: 'dsa_1',
        wallNumber: 1,
        title: 'Barrier 1: Hash Map Lookup',
        question: 'What is the average time complexity to look up a key in a Hash Map / Dictionary?',
        codeSnippet: '// Average time complexity for dict[key]\n// O(1), O(log n), or O(n)?',
        options: [
          { label: 'O(n)', isCorrect: false },
          { label: 'O(log n)', isCorrect: false },
          { label: 'O(1) Constant Time', isCorrect: true },
          { label: 'O(n²)', isCorrect: false },
        ],
        explanation: 'Hash tables calculate a hash bucket index in O(1) average time, giving constant-time lookups.',
      },
      {
        id: 'dsa_2',
        wallNumber: 2,
        title: 'Barrier 2: Shortest Path Search',
        question: 'Which graph traversal algorithm guarantees the shortest path on an unweighted grid?',
        codeSnippet: '// Unweighted grid pathfinding\n// Queue (FIFO) vs Stack (LIFO)?',
        options: [
          { label: 'Depth-First Search (DFS)', isCorrect: false },
          { label: 'Breadth-First Search (BFS)', isCorrect: true },
          { label: 'QuickSort', isCorrect: false },
          { label: 'Linear Search', isCorrect: false },
        ],
        explanation: 'BFS explores neighbor tiles tier-by-tier using a queue, guaranteeing the shortest path in unweighted graphs.',
      },
      {
        id: 'dsa_3',
        wallNumber: 3,
        title: 'Barrier 3: LIFO Data Structure',
        question: 'Which data structure follows the Last-In, First-Out (LIFO) order?',
        codeSnippet: '// push(10), push(20), pop() -> returns 20',
        options: [
          { label: 'Queue', isCorrect: false },
          { label: 'Stack', isCorrect: true },
          { label: 'Array List', isCorrect: false },
          { label: 'Binary Tree', isCorrect: false },
        ],
        explanation: 'A Stack follows Last-In, First-Out (LIFO): the most recently pushed item is the first one popped.',
      },
      {
        id: 'dsa_4',
        wallNumber: 4,
        title: 'Barrier 4: Binary Search Precondition',
        question: 'What requirement must an array satisfy before Binary Search can be applied?',
        codeSnippet: '// binarySearch(arr, target)',
        options: [
          { label: 'It must contain only even numbers', isCorrect: false },
          { label: 'It must be sorted in ascending/descending order', isCorrect: true },
          { label: 'It must have an odd number of items', isCorrect: false },
          { label: 'All elements must be unique', isCorrect: false },
        ],
        explanation: 'Binary Search repeatedly halves the search space, which requires the underlying collection to be sorted.',
      },
      {
        id: 'dsa_5',
        wallNumber: 5,
        title: 'Barrier 5: Recursion Base Case',
        question: 'What is the crucial component that stops a recursive function from running indefinitely?',
        codeSnippet: 'function countdown(n) {\n  if (n <= 0) return; // ???\n  countdown(n - 1);\n}',
        options: [
          { label: 'A while loop', isCorrect: false },
          { label: 'The Base Case condition', isCorrect: true },
          { label: 'A try-catch block', isCorrect: false },
          { label: 'A setTimeout timer', isCorrect: false },
        ],
        explanation: 'The Base Case specifies when recursion terminates, preventing Maximum Call Stack Exceeded crashes.',
      },
    ],
  },
  {
    id: 'cyber_security',
    name: 'Cybersecurity & Networks',
    icon: '🛡️',
    badge: 'Advanced',
    description: 'HTTP status codes, cryptographic hashing, injection defense, and authentication.',
    questions: [
      {
        id: 'sec_1',
        wallNumber: 1,
        title: 'Barrier 1: HTTP Status Codes',
        question: 'Which HTTP response status code represents "Unauthorized" access?',
        codeSnippet: '// Client failed authentication\nHTTP/1.1 ??? Unauthorized',
        options: [
          { label: '200 OK', isCorrect: false },
          { label: '401 Unauthorized', isCorrect: true },
          { label: '404 Not Found', isCorrect: false },
          { label: '500 Server Error', isCorrect: false },
        ],
        explanation: 'HTTP 401 indicates that the request requires valid authentication credentials.',
      },
      {
        id: 'sec_2',
        wallNumber: 2,
        title: 'Barrier 2: Password Storage',
        question: 'How should secure production systems store user passwords in databases?',
        codeSnippet: '// Storing password: "secret_pass_123"\n// Plaintext vs Salted One-Way Hash?',
        options: [
          { label: 'In plain text for quick recovery', isCorrect: false },
          { label: 'As a salted, cryptographically secure one-way hash (e.g. bcrypt/argon2)', isCorrect: true },
          { label: 'Reversible Base64 encoding', isCorrect: false },
          { label: 'In an open JSON file on the desktop', isCorrect: false },
        ],
        explanation: 'Passwords must never be stored in plain text. Salted one-way hashes (bcrypt, argon2) protect credentials.',
      },
      {
        id: 'sec_3',
        wallNumber: 3,
        title: 'Barrier 3: SQL Injection Prevention',
        question: 'Which technique is the primary defense against SQL Injection vulnerabilities?',
        codeSnippet: '// Prevent SQL injection:\n// SELECT * FROM users WHERE id = ?',
        options: [
          { label: 'Direct string concatenation', isCorrect: false },
          { label: 'Parameterized queries & prepared statements', isCorrect: true },
          { label: 'Using ALL CAPS for SQL queries', isCorrect: false },
          { label: 'Running the database without a password', isCorrect: false },
        ],
        explanation: 'Parameterized queries treat user input strictly as parameter data rather than executable SQL syntax.',
      },
      {
        id: 'sec_4',
        wallNumber: 4,
        title: 'Barrier 4: Transport Layer Security',
        question: 'Which port is standard for encrypted HTTPS web traffic?',
        codeSnippet: '// Standard HTTPS default port\nhttps://example.com:???',
        options: [
          { label: 'Port 80', isCorrect: false },
          { label: 'Port 443', isCorrect: true },
          { label: 'Port 22', isCorrect: false },
          { label: 'Port 3306', isCorrect: false },
        ],
        explanation: 'Port 443 is the standard default port for encrypted HTTPS. Unencrypted HTTP uses port 80.',
      },
      {
        id: 'sec_5',
        wallNumber: 5,
        title: 'Barrier 5: Token Authentication',
        question: 'What does JWT stand for in modern web authentication?',
        codeSnippet: '// Bearer token auth format: header.payload.signature',
        options: [
          { label: 'JSON Web Token', isCorrect: true },
          { label: 'JavaScript Wired Tool', isCorrect: false },
          { label: 'Java Web Template', isCorrect: false },
          { label: 'Joint Web Task', isCorrect: false },
        ],
        explanation: 'JWT stands for JSON Web Token, an open standard for securely transmitting verified information between parties.',
      },
    ],
  },
  {
    id: 'web_apis',
    name: 'Full-Stack & APIs',
    icon: '🌐',
    badge: 'Practical',
    description: 'RESTful API verbs, JSON serialization, state management, and async networking.',
    questions: [
      {
        id: 'api_1',
        wallNumber: 1,
        title: 'Barrier 1: RESTful Creation',
        question: 'Which HTTP method is conventionally used to create a new resource on a server?',
        codeSnippet: '// Creating a new pet record\n??? /api/v1/pets',
        options: [
          { label: 'GET', isCorrect: false },
          { label: 'DELETE', isCorrect: false },
          { label: 'POST', isCorrect: true },
          { label: 'HEAD', isCorrect: false },
        ],
        explanation: 'POST is the standard REST HTTP verb used when creating a new resource entity on the server.',
      },
      {
        id: 'api_2',
        wallNumber: 2,
        title: 'Barrier 2: JSON Deserialization',
        question: 'Which JavaScript method converts a JSON string into an interactive object?',
        codeSnippet: 'const jsonStr = \'{"pet":"cat","level":3}\';\nconst obj = ???(jsonStr);',
        options: [
          { label: 'JSON.stringify(jsonStr)', isCorrect: false },
          { label: 'JSON.parse(jsonStr)', isCorrect: true },
          { label: 'JSON.toObject(jsonStr)', isCorrect: false },
          { label: 'Object.from(jsonStr)', isCorrect: false },
        ],
        explanation: 'JSON.parse() deserializes valid JSON text into native JavaScript objects.',
      },
      {
        id: 'api_3',
        wallNumber: 3,
        title: 'Barrier 3: React State Immutability',
        question: 'Why should React state never be mutated directly (e.g. state.count = 5)?',
        codeSnippet: '// Bad: count++;\n// Good: setCount(prev => prev + 1);',
        options: [
          { label: 'Direct mutation does not trigger re-rendering of the component', isCorrect: true },
          { label: 'JavaScript does not allow object mutations', isCorrect: false },
          { label: 'It causes the browser to close immediately', isCorrect: false },
          { label: 'It automatically clears localStorage', isCorrect: false },
        ],
        explanation: 'React relies on shallow reference equality comparison to detect changes and schedule UI re-renders.',
      },
      {
        id: 'api_4',
        wallNumber: 4,
        title: 'Barrier 4: CORS Header',
        question: 'What does CORS stand for in browser security?',
        codeSnippet: '// Access-Control-Allow-Origin: *',
        options: [
          { label: 'Cross-Origin Resource Sharing', isCorrect: true },
          { label: 'Code Optimized Realtime Socket', isCorrect: false },
          { label: 'Central Operating Routing System', isCorrect: false },
          { label: 'Client Origin Response State', isCorrect: false },
        ],
        explanation: 'CORS (Cross-Origin Resource Sharing) is a browser mechanism that restricts resource requests across domains.',
      },
      {
        id: 'api_5',
        wallNumber: 5,
        title: 'Barrier 5: WebSockets vs HTTP',
        question: 'What is the key advantage of WebSockets over traditional HTTP request/response polling?',
        codeSnippet: '// Real-time bidirectional channel: wss://',
        options: [
          { label: 'WebSockets can only send text files', isCorrect: false },
          { label: 'Full-duplex, low-latency persistent connection for real-time messaging', isCorrect: true },
          { label: 'WebSockets do not require a network connection', isCorrect: false },
          { label: 'It replaces CSS stylesheets', isCorrect: false },
        ],
        explanation: 'WebSockets maintain an open, full-duplex TCP channel, allowing instantaneous server pushes with minimal overhead.',
      },
    ],
  },
];

export function getQuestionSetById(id: string): DuelQuestion[] {
  const found = QUESTION_SETS.find((s) => s.id === id);
  if (found) return found.questions;
  return QUESTION_SETS[0].questions;
}

export function getRandomDuelQuestions(count = 5): DuelQuestion[] {
  const all = QUESTION_SETS.flatMap((s) => s.questions);
  const shuffled = [...all].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map((q, i) => ({
    ...q,
    wallNumber: i + 1,
    title: `Barrier ${i + 1}: ${q.title.replace(/^Barrier \d+:\s*/, '')}`,
  }));
}
