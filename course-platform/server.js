require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const Razorpay = require('razorpay');
const { readDb, writeDb, nextId } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'course-platform-secret',
    resave: false,
    saveUninitialized: false
  })
);

const razorpayClient =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      })
    : null;

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user;
  res.locals.razorpayKey = process.env.RAZORPAY_KEY_ID || '';
  next();
});

const ensureAuth = (req, res, next) => {
  if (!req.session.user) return res.redirect('/login');
  next();
};

const ensureAdmin = (req, res, next) => {
  if (!req.session.user?.isAdmin) return res.status(403).render('forbidden');
  next();
};

app.get('/', (req, res) => {
  const db = readDb();
  res.render('index', { courses: db.courses });
});

app.get('/signup', (req, res) => res.render('signup', { error: '' }));
app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  const db = readDb();

  if (db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).render('signup', { error: 'Email already exists.' });
  }

  const hashedPassword = hashPassword(password);
  const user = {
    id: nextId(db.users),
    name,
    email,
    password: hashedPassword,
    isAdmin: false
  };

  db.users.push(user);
  writeDb(db);

  req.session.user = { id: user.id, name: user.name, email: user.email, isAdmin: false };
  res.redirect('/dashboard');
});

app.get('/login', (req, res) => res.render('login', { error: '' }));
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const db = readDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user || hashPassword(password) !== user.password) {
    return res.status(400).render('login', { error: 'Invalid credentials.' });
  }

  req.session.user = { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin };
  res.redirect(user.isAdmin ? '/admin' : '/dashboard');
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

app.get('/dashboard', ensureAuth, (req, res) => {
  const db = readDb();
  const purchasedCourseIds = db.purchases
    .filter((p) => p.userId === req.session.user.id && p.status === 'paid')
    .map((p) => p.courseId);

  const purchasedCourses = db.courses.filter((course) => purchasedCourseIds.includes(course.id));
  res.render('dashboard', { purchasedCourses });
});

app.post('/create-order', ensureAuth, async (req, res) => {
  try {
    if (!razorpayClient) {
      return res.status(500).json({ error: 'Razorpay is not configured. Add API keys in .env' });
    }

    const courseId = Number(req.body.courseId);
    const db = readDb();
    const course = db.courses.find((c) => c.id === courseId);

    if (!course) return res.status(404).json({ error: 'Course not found' });

    const order = await razorpayClient.orders.create({
      amount: course.price * 100,
      currency: 'INR',
      receipt: `course_${course.id}_user_${req.session.user.id}`
    });

    db.purchases.push({
      id: nextId(db.purchases),
      userId: req.session.user.id,
      courseId,
      orderId: order.id,
      paymentId: '',
      status: 'created'
    });
    writeDb(db);

    res.json({ order, course });
  } catch (error) {
    res.status(500).json({ error: 'Unable to create order', detail: error.message });
  }
});

app.post('/verify-payment', ensureAuth, (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Payment verification failed' });
  }

  const db = readDb();
  const purchase = db.purchases.find(
    (p) => p.orderId === razorpay_order_id && p.userId === req.session.user.id
  );

  if (!purchase) return res.status(404).json({ success: false, message: 'Purchase record not found' });

  purchase.paymentId = razorpay_payment_id;
  purchase.status = 'paid';
  writeDb(db);

  res.json({ success: true, message: 'Payment verified. Course unlocked!' });
});

app.get('/admin', ensureAuth, ensureAdmin, (req, res) => {
  const db = readDb();
  res.render('admin', { courses: db.courses });
});

app.post('/admin/courses', ensureAuth, ensureAdmin, (req, res) => {
  const { title, description, price, thumbnail, videoUrl } = req.body;
  const db = readDb();
  db.courses.push({
    id: nextId(db.courses),
    title,
    description,
    price: Number(price),
    thumbnail,
    videoUrl
  });
  writeDb(db);
  res.redirect('/admin');
});

app.use((req, res) => {
  res.status(404).render('not-found');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
