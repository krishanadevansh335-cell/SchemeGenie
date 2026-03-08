# SchemeGenie 🧞‍♂️

![Node.js](https://img.shields.io/badge/Node.js-Backend-green)
![React](https://img.shields.io/badge/React-Frontend-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-brightgreen)
![License](https://img.shields.io/badge/License-MIT-purple)

## Project Overview
SchemeGenie is an intelligent, scalable platform designed to simplify the discovery, application, and tracking of government schemes. It bridges the gap between citizens and benefits, leveraging AI-powered chatbots, OCR document verification, and modern web architecture.

## The Problem
Navigating government schemes can often be confusing due to fragmented information, complicated eligibility criteria, and a tremendous amount of manual paperwork. Citizens frequently miss out on benefits simply because they don't know they qualify or find the application process overwhelming.

## Features
- **Intelligent Scheme Recommendation**: Personalized scheme suggestions based on user profiles.
- **AI Chatbot Assistant**: Real-time guide to answer queries and assist in the application process.
- **Smart Document Processing**: Integrated OCR for automated extraction and verification of uploaded documents.
- **Real-Time Application Tracking**: Transparent tracking of application statuses from submission to approval.
- **Administrative Dashboard**: Seamless control for administrators to review applications, manage users, and update schemes.
- **Multi-lingual Support**: Accessible translations for a broader reach.

## Tech Stack
- **Frontend**: React.js, Tailwind CSS, Spline3D, Framer Motion
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **AI & Integrations**: Google Gemini, Tesseract.js (OCR)

## Architecture
At its core, SchemeGenie features a modern, clean MERN-stack flow. 

**User → React Frontend → Node.js API → MongoDB** 

The decoupled backend incorporates several micro-services structured internally:
- Scheme recommendation engine
- OCR document processing
- AI Chatbot service
- Application tracking & Admin controls

*For more details, see [Architecture Diagram](docs/architecture.md).*

## Screenshots

| Home Page | Admin Dashboard |
| :---: | :---: |
| ![Home](docs/screenshots/home-page.png) | ![Admin Dashboard](docs/screenshots/admin-dashboard.png) |

| Chatbot Interface | Scheme Recommendations |
| :---: | :---: |
| ![Chatbot](docs/screenshots/chatbot-interface.png) | ![Recommendations](docs/screenshots/scheme-recommendations.png) |

| Application Tracking | Document Upload |
| :---: | :---: |
| ![Tracking](docs/screenshots/application-tracking.png) | ![Upload](docs/screenshots/document-upload.png) |

## Demo
*(Live Demo Link / Video Link coming soon)*  
[Watch the walkthrough on YouTube](#)

## Folder Structure

```
SchemeGenie/
├── backend/          # Node.js Express server
│   ├── config/       # Environment & Database config
│   ├── controllers/  # API route controllers
│   ├── middleware/   # Auth & custom middlewares
│   ├── models/       # Mongoose Schemas
│   ├── routes/       # Express route definitions
│   ├── services/     # OCR, Chatbot, AI integration logic
│   └── server.js     # Entry point
├── frontend/         # React Application
│   ├── public/       # Static assets
│   ├── src/          # React components, contexts, UI
│   └── package.json  
├── ai-chatbot/       # Dedicated Chatbot module
├── docs/             # Architecture diagrams, screenshots
├── scripts/          # Database seeding & utility scripts
└── tests/            # Test suites and checkers
```

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/SchemeGenie.git
cd SchemeGenie
```

### 2. Environment Setup
Create the required environment files.
```bash
copy .env.example .env
```
Ensure you provide your own `OPENAI_API_KEY`, `MONGO_URI`, and `PORT`.

### 3. Backend Setup
```bash
cd backend
npm install
npm start
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm start
```

## Contribution Guide
We welcome contributions to make SchemeGenie better accessible to citizens!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License
Distributed under the MIT License. See `LICENSE` for more information.
