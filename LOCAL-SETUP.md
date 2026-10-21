# Run AI Career Copilot on Windows

This guide is for running the project on your own Windows computer at http://localhost:1295.

## Easiest method

1. Open the repository: https://github.com/Emmy1-tech/ai-career-copilot
2. Click the green Code button, then Download ZIP.
3. Open File Explorer and select Downloads.
4. Right-click the downloaded ZIP and select Extract All.
5. Open the extracted ai-career-copilot folder. Make sure you can see package.json, server.js, and start-local.bat.
6. Double-click start-local.bat.
7. If Windows says Node.js is missing, install Node.js 20 or newer from https://nodejs.org/en/download. After installation, close the launcher window and double-click start-local.bat again.
8. Wait while the launcher installs dependencies and starts the server.
9. Open Google Chrome, click the address bar, type http://localhost:1295, and press Enter.
10. Keep the black terminal window open while using the site. To stop the server, click that window and press Ctrl+C.

## AI assistant setup

The app can start without a Gemini API key. Without a key, resume analysis uses a clearly labelled rules-based demo and the AI chat endpoint explains that AI is not configured.

To enable Gemini:
1. Stop the server by pressing Ctrl+C in its terminal window.
2. Open the project folder in File Explorer.
3. Find the file named .env. If you cannot see it, enable View > Show > File name extensions and Hidden items in File Explorer.
4. Open .env using Notepad.
5. Find GEMINI_API_KEY= and paste your API key immediately after the equals sign, with no quotes or spaces around the key.
6. Save the file and close Notepad.
7. Run start-local.bat again.

Never share your API key or commit your .env file to GitHub. Keep the key on the server, not in browser JavaScript.

## Troubleshooting

- 'node' is not recognized: install Node.js 20 or newer, then close and reopen the launcher.
- Port 1295 is already in use: close the other application using that port or stop the other copy of this app.
- Page cannot be reached: make sure the launcher terminal is still open and that the server started without an error.
- Dependency installation fails: check your internet connection and copy the full terminal error for diagnosis.

## What localhost means

localhost is this computer only. The site is not public on the internet just because it opens at localhost:1295.
