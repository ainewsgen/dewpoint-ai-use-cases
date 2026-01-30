# PRODUCT SPECIFICATION: The DewPoint Opportunity Engine

## 1. PRODUCT VISION
A high-end, AI-powered consultancy tool that generates bespoke AI automation strategies for SMBs. Unlike generic tools, it separates the "Public Vision" (outcome-focused) for the user from the "Admin Blueprint" (tech-focused) for The DewPoint Group, serving as a powerful lead generation magnet.

## 2. USER PERSONAS
* **The User (SMB Executive):** Wants to know *what* is possible and the ROI. Doesn't care about APIs or webhooks.
* **The Admin (DewPoint Developer):** Needs the exact recipe (Tech Stack, Logic Flow) to build and sell the solution.

## 3. CORE USER FLOW
1.  **Onboarding (The Context Engine):**
    * **Input 1:** Company URL (Essential for scraping/analysis).
    * **Input 2:** Role (e.g., CEO, Head of Ops).
    * **Input 3:** Current Tech Stack (Multi-select: Salesforce, HubSpot, QuickBooks, Gmail, etc.).
    * **Input 4 (The Pain Probe):** "What is the one weekly task that makes your team groan?"
2.  **Analysis Phase (Hidden):**
    * App scrapes URL to identify industry, competitors, and business model.
    * App cross-references industry pains with the User's Tech Stack.
3.  **The Reveal (The Opportunity Matrix):**
    * User sees 3-5 high-impact "Opportunity Cards" categorized by Department.
    * User can toggle views: "Revenue Generating" vs. "Time Saving."
4.  **Conversion:**
    * User clicks "Get this Blueprint" or "Add to Roadmap."
    * Action triggers a lead capture for DewPoint, sending the *Admin View* (technical details) to the DewPoint team.

## 4. KEY FEATURES & LOGIC

### A. The "Dual-View" Generator
The AI must generate every idea in two distinct layers:
* **Layer 1: Public View (The Hook)**
    * *Headline:* Benefit-driven (e.g., "Zero-Touch Invoice Processing").
    * *Narrative:* "Your team forwards an invoice, and our Agent automatically verifies it against the contract and schedules payment."
    * *ROI Badge:* "Saves ~12 hrs/week."
* **Layer 2: Admin View (The Recipe)**
    * *Stack:* Specific tools (e.g., "Antigravity + n8n + Xero API").
    * *Logic:* Step-by-step logic (e.g., "Webhook -> OCR -> Regex Match -> API POST").
    * *Complexity Score:* 1-5 (Used for pricing/feasibility).

### B. The Use Case Library
A browseable archive of pre-generated strategies to inspire users who aren't ready to input their data.
* **Filters:** Industry (Real Estate, Legal), Department (HR, Sales), Tech Stack.
* **Feature:** "Wishlist" – Users can build a cart of features they want to discuss on a call.

### C. Advanced Logic Modules
* **Data Asset Audit:** Logic that detects "dormant data" (e.g., if User = Law Firm, suggest "Case File Mining").
* **Competitor Gap:** Logic that infers competitor weaknesses based on the user's industry standard.

## 5. UI/UX REQUIREMENTS
* **Aesthetic:** "Boutique Consultancy" (Clean, minimal, high-trust). Dark mode preferred for Admin dashboard.
* **Card Design:**
    * Front: Title, ROI Badge, One-sentence hook.
    * Expanded: Full "Public View" narrative + "Get Blueprint" button.
* **Admin Dashboard:** A simple table view for DewPoint staff to see:
    * User Name / Contact.
    * The specific "Admin View" technical specs generated for them.

## 6. TECHNICAL CONSTRAINTS
* **Output Format:** All AI generation must be structured JSON to allow separating the Public/Admin views programmatically.
* **Privacy:** No user data is stored persistently for training; only for the session and the lead capture.
