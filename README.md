# 🎟️ Meetsy: Professional Event Management Platform

Welcome to **Meetsy**, an end-to-end event management ecosystem designed to make organizing, running, and analyzing professional events as smooth as possible. 

Whether you're hosting an intimate AI workshop or a massive tech conference, Meetsy handles everything from custom registration forms to QR-code door scanning, all wrapped in a premium, modern design.

---

## ✨ What is Meetsy?

Meetsy is a full-stack web application built to solve the chaos of event organizing. It breaks down the entire event lifecycle into a simple, predictable flow. 

**For Organizers:** It provides a strategic dashboard, AI-powered insights, and total control over who gets invited and approved.
**For Attendees:** It offers a beautifully simple registration experience.
**For Event Staff:** It acts as a mobile-friendly "pocket tool" to scan tickets and manage the door on the big day.

---

## 🛤️ How the App Works (Start to Finish)

Here is the journey of an event on Meetsy, broken down into simple steps:

### 1. The Setup (Before the Event)
* 🏗️ **Create an Event:** The organizer logs into the Admin Dashboard and creates a new event.
* 📝 **Build a Form:** Using the drag-and-drop Form Builder, the organizer decides exactly what information to ask attendees (e.g., "What is your job title?", "Dietary restrictions?").
* 💌 **Design Emails:** The organizer customizes the automatic emails that get sent out when someone registers, gets approved, or gets rejected.

### 2. The Registration (Attendees Join)
* 🔗 **Share the Link:** The organizer shares the public registration page.
* 🙋 **People Apply:** Attendees fill out the form. Instead of getting a ticket immediately, they go into a "Pending" list. 
* ✅ **Approval:** The organizer reviews the list and clicks "Approve" for the people they want. Approved attendees automatically receive an email with their unique **QR Code Ticket**.

### 3. The Big Day (During the Event)
* 📱 **Staff Portal:** Event staff log into the mobile-friendly Staff Portal using a secure 6-digit PIN. 
* 📷 **Scan Tickets:** Staff use their phone cameras to scan attendee QR codes at the door. The screen flashes green for "Approved" and red for "Invalid."
* 🚶 **Walk-ins:** If someone forgot their ticket, staff can quickly register them manually using the "Walk-in" page.

### 4. The Wrap-Up (After the Event)
* 📈 **Strategic Dashboard:** The organizer opens their Meetsy dashboard to see a beautiful, YouTube-style timeline chart showing attendance rates across all their past events.
* 🤖 **AI Post-Mortem:** Meetsy's integrated AI analyzes the event data (like what job titles attended the most) and generates a smart "Post-Mortem Report" with actionable advice for the next event!

---

## 🛠️ The Tech Stack

Meetsy is built using modern, industry-standard tools to ensure it is fast, secure, and beautiful.

### Frontend (What you see)
* **React.js & Vite:** For a lightning-fast, interactive user interface.
* **TailwindCSS:** For styling. Meetsy uses a custom "Modern Brutalist" aesthetic with bold borders, deep shadows, and seamless Dark/Light mode support.
* **Zustand:** For keeping track of data (state management) behind the scenes without slowing the app down.
* **Recharts:** For rendering the beautiful, interactive data charts on the dashboard.
* **Progressive Web App (PWA):** The Staff Portal is built as a PWA, meaning staff can "Install" it to their phone's home screen like a native app.

### Backend (What powers it)
* **Node.js & Express:** The engine that handles all the data traffic and API requests securely.
* **Prisma & SQLite:** The database architecture that safely stores all event and attendee data.
* **Local AI Integration:** Meetsy connects to a local AI model (Phi-4 via Ollama) to securely process attendee data and generate intelligent event reports without sending private data to external servers.

---

## 🎨 Design Philosophy: Neurodivergent Friendly

Meetsy was designed with cognitive accessibility in mind. Event organizing is stressful, so the app's interface shouldn't be. 

* **High Contrast:** We use a bold "Brutalist" design. Buttons look like actual buttons. Borders are thick and clear.
* **Skeleton Loaders:** Instead of confusing spinning wheels, the app shows "Skeletons" (grey blocks shaping the layout) while data loads, reducing cognitive friction and anxiety.
* **Clear Color Coding:** Success is always green. Errors are always red. Actions are bold pink/red. No guessing required.
* **Focused Portals:** We separated the complex Admin tools from the Staff door-scanning tools. Staff only see exactly what they need for their job—nothing more.

---

## 💻 How to Run Locally

Want to spin up Meetsy on your own machine? It's designed to be simple to run.

### Prerequisites
* **Node.js** (v18 or higher)
* **Ollama** (optional, but required if you want to test the AI Post-Mortem features. You will need to pull the `phi4` model locally).

### 1. Database & Server Setup
Open a terminal and navigate to the `server` directory:
```bash
cd server
npm install
```

Set up your environment variables by creating a `.env` file in the `server` directory:
```env
PORT=3000
JWT_SECRET=super_secret_key_change_me
ADMIN_PASSWORD=password123
DATABASE_URL="file:./dev.db"

# Optional: Swap the local AI model (Defaults to phi4)
# OLLAMA_MODEL=llama3.1
```

Initialize the database and start the backend:
```bash
npx prisma db push
npm run dev
```
*The server is now running on `http://localhost:3000`.*

### 2. Frontend Setup
Open a **new** terminal window and navigate to the `client` directory:
```bash
cd client
npm install
npm run dev
```
*The frontend is now running on `http://localhost:5173`.*

### 3. Log In!
Navigate to `http://localhost:5173` in your browser. Use the admin password you set in your `.env` file (e.g., `password123`) to unlock the dashboard and start creating events!

### 4. Swapping the AI Model (Optional)
Meetsy uses Ollama to run AI entirely locally for total privacy. By default, it looks for the `phi4` model. If you want to use a different local model (like `llama3.1` or `mistral`), simply:
1. Pull the model to your machine: `ollama run llama3.1`
2. Add `OLLAMA_MODEL=llama3.1` to your `server/.env` file.
3. Restart the backend server. Meetsy will automatically adapt to the new model!

*(Note: In the Event Report Dashboard, you will see a dropdown menu with options for "Gemini Pro (Cloud)" and "OpenAI (Cloud)". These are UI placeholders designed to demonstrate how cloud APIs could be integrated into the layout. The backend pipeline is currently optimized exclusively for local execution via Ollama to ensure attendee data privacy).*

---

## 🛠️ For Developers: Activating Cloud or Alternative AI Providers

Meetsy is architected to be highly extensible. While it defaults to secure local AI execution via Ollama (phi4), the infrastructure is already built to support external Cloud APIs (like OpenAI or Google Gemini) or even other local inference engines (like LM Studio or Llama.cpp).

If you want to activate the placeholders in the UI or add your own, simply follow these steps:

1. **Locate the Service File:** Open `server/src/modules/reports/ai-strategist.service.js`.
2. **Uncomment the Switch Cases:** Around line 53, you will find the provider `switch` statement. Uncomment or add your target provider:
   ```javascript
   switch (provider.toLowerCase()) {
     case 'phi4':
     case 'local':
       insights = await callPhi4Local(systemPrompt, payload);
       break;
     // For Cloud APIs:
     case 'gemini':
       insights = await callGeminiCloud(systemPrompt, payload); 
       break;
     // For alternative Local APIs:
     case 'lmstudio':
       insights = await callLMStudio(systemPrompt, payload); 
       break;
   }
   ```
3. **Build the Adapter:** Create your adapter function (`callGeminiCloud`, `callLMStudio`, etc.) below it. 
   * **For Cloud:** Use your preferred SDK (e.g., `@google/generative-ai` or `openai`) and inject your API key from the `.env` file.
   * **For Local:** Perform a local `fetch()` request to your inference engine's endpoint.
   * **Return Format:** Make sure your function returns the response exactly as an array of JSON objects matching the schema: `[{ title, description }]`.
4. **Done!** Because the Frontend UI is already wired up to send the `aiProvider` string to the backend when you select it from the dropdown, it will seamlessly route to your new function and render the results perfectly.

---

## 📧 Testing the Email Pipeline

Meetsy features a fully integrated email pipeline designed to send beautiful, Brutalist-styled QR tickets to attendees when they are approved. It is built to be developer-friendly so you can test the app without accidentally spamming anyone!

### 1. Mock Mode (Default)
Out of the box, the app will automatically run in "Mock Mode" to save you from needing API keys right away. 
* Whenever you approve an attendee in the dashboard, the app intercepts the email.
* Instead of physically sending it, it beautifully logs the exact email payload directly into your backend terminal (showing you who it was to, the subject line, and the HTML size). 
* *Try it out: Go to the Data Manager, click 'Approve' on an attendee, and watch your server console!*

### 2. Going Live with Resend
When you are ready to send actual emails (with real QR code attachments):
1. Go to [Resend.com](https://resend.com) and create a free account.
2. Generate an API Key.
3. Open your `server/.env` file and add your key:
   `RESEND_API_KEY="re_your_real_key_here"`
4. **Important:** Resend requires you to verify your domain. Update the `from:` address located inside `server/src/modules/email/email.adapter.js` (around line 58) to match the email address you verified with Resend.

Once you restart your backend server with a valid key, Meetsy will automatically detect it, bypass Mock Mode, and start physically delivering emails!
