# CourseHub - Modern Course Selling Website

A full-stack Node.js website for selling online courses with authentication, Razorpay payments, learner dashboard, and admin upload panel.

## Features
- Homepage with modern course cards and pricing
- User signup/login with session-based authentication
- Purchase flow with Razorpay order creation + signature verification
- Dashboard with access to purchased course videos
- Admin panel to upload courses and video links
- Responsive, clean UI for desktop and mobile

## Folder Structure
```
course-platform/
├── data/
│   └── db.json                 # JSON database (users, courses, purchases)
├── public/
│   ├── css/
│   │   └── styles.css          # Modern responsive styles
│   └── js/
│       └── main.js             # Razorpay checkout and payment verify logic
├── views/
│   ├── partials/
│   │   ├── header.ejs
│   │   └── footer.ejs
│   ├── admin.ejs
│   ├── dashboard.ejs
│   ├── forbidden.ejs
│   ├── index.ejs
│   ├── login.ejs
│   ├── not-found.ejs
│   └── signup.ejs
├── .env.example
├── db.js                       # DB helpers
├── package.json
└── server.js                   # Express app and routes
```

## Setup and Run
1. Install dependencies:
   ```bash
   cd course-platform
   npm install
   ```
2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Add your Razorpay test/live keys in `.env`.
3. Start server:
   ```bash
   npm run dev
   ```
   or
   ```bash
   npm start
   ```
4. Open in browser:
   ```
   http://localhost:3000
   ```

## Demo Admin Login
- Email: `admin@courses.com`
- Password: `admin123`

## Notes
- Prices are in INR.
- `data/db.json` acts as a local database for quick development.
- Use Razorpay test keys for local testing.
