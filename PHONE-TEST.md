# Test AI Career Copilot on your phone

This guide tests the existing Node.js app over your own Wi-Fi. It does not publish the app to the public internet.

## Before you start

- Your Windows computer and phone must be connected to the same trusted Wi-Fi network.
- Start the app on Windows with `start-local.bat`.
- Keep the terminal open. The app should report that it is running on port 1295.

## 1. Find the computer's Wi-Fi IPv4 address

1. On Windows, press `Win + R`, type `cmd`, and press Enter.
2. Run:

   ```cmd
   ipconfig
   ```

3. Under the active **Wireless LAN adapter Wi-Fi**, find **IPv4 Address**. It may look like `192.168.1.25`. Use the address shown on your computer, not this example.
4. Do not use the Default Gateway address, and do not use `127.0.0.1` or `localhost` on your phone.

## 2. Open the site on your phone

On the phone, open Chrome or Safari and visit:

```text
http://YOUR-COMPUTER-IP:1295
```

For example, if your actual computer IPv4 address is `192.168.1.25`, use `http://192.168.1.25:1295`.

## 3. If it does not open

1. Confirm the local site still works on the computer at `http://localhost:1295`.
2. Confirm both devices are on the same Wi-Fi network. Some guest Wi-Fi networks block devices from communicating with each other.
3. If Windows Firewall prompts you, only allow Node.js on a **private network** you trust. Do not turn the firewall off.
4. If no prompt appears, Windows may be blocking inbound connections. On a trusted private network, create a narrowly scoped inbound TCP rule for port `1295`; remove the rule after testing if you no longer need it.
5. Make sure the terminal has no error and the server is still running.

Never port-forward port 1295 on your router or expose this development server directly to the public internet.

## What this test proves

If the page loads, your phone can reach the app on your local network. It does **not** mean the site is published publicly, and the computer must remain on with the server running.

## Public deployment is a separate step

The app uses an Express/Node.js backend and writes application records to a JSON file. Static hosting alone cannot run the backend, and ephemeral serverless hosting is not a safe fit for the current JSON persistence layer. Before a public multi-user launch, deploy to a Node.js host with supported persistent storage or migrate persistence to a managed database, and add authentication and per-user data ownership.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the deployment decision checklist.
