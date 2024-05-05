if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const express = require('express');
const moment = require('moment');
const bcrypt = require('bcrypt');
const User = require('./model/config');
const Product =require ('./model/produk');
const Message=require('./model/message');
const Ticket=require('./model/tiket');
const app = express();
const port = 3000;
const bodyParser = require('body-parser');
const expressLayouts = require('express-layouts');
const mongoose = require('mongoose');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublicKey = process.env.STRIPE_PUBLIC_KEY;
const stripe = require('stripe')(stripeSecretKey);
const DOMAIN = 'http://localhost:3000';
app.use(express.static('views'));

const cors = require('cors');
app.use(express.json());
app.use(cors());
app.use(function(req, res, next) {
res.setHeader('Access-Control-Allow-Origin', DOMAIN); // Replace with your actual domain
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
res.setHeader('Access-Control-Allow-Credentials', 'true');
next();
});

const session = require('express-session');
mongoose.connect("mongodb://ophelia:ophelia40000@ac-aqutpl4-shard-00-00.qrs1gvx.mongodb.net:27017,ac-aqutpl4-shard-00-01.qrs1gvx.mongodb.net:27017,ac-aqutpl4-shard-00-02.qrs1gvx.mongodb.net:27017/?ssl=true&replicaSet=atlas-qewgw8-shard-0&authSource=admin&retryWrites=true&w=majority&appName=AtlasCluster", {
useNewUrlParser: true,
useUnifiedTopology: true
}).then(() => {
console.log('Connected to MongoDB');
}).catch(err => {
console.error('Error connecting to MongoDB:', err);
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'rahasia', 
  resave: false,
  saveUninitialized: true
}));
app.set("view engine","ejs");
app.use(expressLayouts);
app.use(express.json());

app.use(express.static("public"));
app.get('/', (req, res) => {
 const user = req.session.user;
 res.render('index.ejs', { layout: 'mainlayout', title: 'Dufan', user: user });
});




app.get("/test",(req,res) =>{
 const user = req.session.user;
 res.render("test.ejs",{title:`Place To Stay`,layout:`mainlayout.ejs`, user: user})
});


app.get('/cart', async (req, res) => {
 try {
     const userId = req.session.user._id;
     const user = await User.findById(userId).populate('cart');
     
     let totalPrice = 0;
     user.cart.forEach(item => {
         totalPrice += parseFloat(item.price);
     });

     req.session.cart = user.cart;
     req.session.totalCartPrice = totalPrice;

     res.render('cart', { cart: user.cart, totalCartPrice: totalPrice, user: req.session.user, layout: 'mainlayout.ejs', title: 'Cart' });
 } catch (error) {
     console.error('Error fetching user cart:', error);
     res.status(500).send('Internal Server Error');
 }
});

app.get("/checkout",(req,res) =>{
  const user = req.session.user;
  res.render("checkout.ejs",{title:`Payment`, user: user, layout:false})
  
});

app.post('/checkout', (req, res) => {
const cart = req.body.cart.map(item => JSON.parse(item));
// Now you have access to the cart data
res.render('checkout', { cart: cart , layout:false});
});


app.get("/things_to_do",(req,res) =>{
 const user = req.session.user;
 res.render("things_to_do.ejs",{title:`Thing To Do`,layout:`mainlayout.ejs`, user: user})
});

app.get('/admin', (req, res) => {
if (req.session.user && req.session.user.isAdmin) {
    res.render('admin.ejs',{layout:false}); // Render halaman dashboard admin
} else {
    res.status(403).send('Akses Ditolak'); // Pengguna bukan admin
}
});



app.get("/dufan",async (req,res) =>{
 const user = req.session.user;
 try {
    let query = req.query.query;
    if (!query || typeof query !== 'string') {
        const products = await Product.find({}).exec();
        return res.render('dufan', { products, title: 'Souvenir', layout: 'mainlayout', user: user });
    }

    const products = await Product.find({ name: { $regex: query, $options: 'i' } }).exec();
    res.render('dufan', { products, title: 'Souvenir', layout: 'mainlayout', user: user });
} catch (err) {
    console.error('Error searching products:', err);
    res.status(500).send('Internal Server Error');
}
});

app.get("/payment", function(req, res) {
  res.render("payment.ejs",{title:`Checkout`,layout:false})
})

app.get("/login",(req,res) =>{
 res.render("login.ejs",{title:`Login`,layout:false})
});
app.get("/register",(req,res) =>{
 res.render("register.ejs",{title:`Login`,layout:false})
});
app.get('/logout', (req, res) => {

 req.session.destroy((err) => {
     if (err) {
         console.error('Error destroying session:', err);
         return res.redirect('/'); 
     }
     
     res.redirect('/'); 
 });
});

app.post('/register', async (req, res) => {
try {
  const existingUser = await User.findOne({ $or: [{ email: req.body.email }, { username: req.body.username }] });
  if (existingUser) {
    return res.send('<script>alert("Username atau Email sudah terdaftar!"); window.location.href = "/register";</script>');
  }
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const newUser = new User({
    username: req.body.username,
    email: req.body.email,
    password: hashedPassword
  });
  await newUser.save();
  res.redirect('/login');
} catch (err) {
  console.error('Error registering user:', err);
  res.redirect('/register');
}
});


app.post('/login', async (req, res) => {
try {
    const user = await User.findOne({ email: req.body.email });

    if (!user || !await bcrypt.compare(req.body.password, user.password)) {
        return res.status(401).send('<script>alert("Email atau Password salah"); window.location.href = "/login";</script>');
    }

    req.session.user = user; // Menyimpan informasi pengguna dalam sesi

    if (user.isAdmin) {
        res.redirect('/admin'); // Arahkan admin ke dashboard admin
    } else {
        res.redirect('/'); // Arahkan pengguna biasa ke halaman utama
    }
} catch (err) {
    console.error('Error:', err);
    res.redirect('/login');
}
});



app.post('/addToCart', async (req, res) => {
  try {
      const productId = req.body.productId;
      const userId = req.session.user._id;
      const user = await User.findById(userId);
      if (user.cart.includes(productId)) {
          return res.json({ alreadyExists: true }); 
      } else {
          await User.findByIdAndUpdate(userId, { $addToSet: { cart: productId } });
          return res.sendStatus(200); 
      }
  } catch (error) {
      console.error('Error adding product to cart:', error);
      res.status(500).send('Internal Server Error');
  }
});

app.post('/removeFromCart', async (req, res) => {
 try {
     const productId = req.body.productId;
     const userId = req.session.user._id;
     await User.findByIdAndUpdate(userId, { $pull: { cart: productId } });
     res.sendStatus(200);
 } catch (error) {
     console.error('Error removing item from cart:', error);
     res.status(500).send('Internal Server Error');
 }
});

app.get('/success', (req, res) => {
  res.render('success.ejs',{title:`success`,layout:false}); // Render the success.ejs template
});

// Define a route for the cancel URL
app.get('/cancel', (req, res) => {
  res.render('cancel.ejs', {title:`cancel`,layout:false}); // Render the cancel.ejs template
});

app.post('/create-checkout-session', async (req, res) => {
try {
  const cartItems = req.body.cart.map(item => JSON.parse(item));
  console.log('Cart Items:', cartItems);

  // Define line items
  const lineItems = cartItems.map(item => {
    return {
      price: item.stripeId,
      quantity: 1, // Assuming quantity is always 1 for each item
    };
  });

  // Create the checkout session with line items
  const session = await stripe.checkout.sessions.create({
    line_items: lineItems,
    payment_method_types: ['card'],
    mode: 'payment',
    success_url: `${DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${DOMAIN}/cancel`
  });

  // Redirect to checkout session URL
  res.redirect(303, session.url);
} catch (error) {
  console.error('Error creating checkout session:', error);
  res.status(500).send('Internal Server Error');
}
});

app.post('/create-checkout-session-ticket', async (req, res) => {
  try {
    const { ticketType, visitDate, quantity, stripeId } = req.body;
    const pricePerTicket = ticketType === 'Premium' ? 300000 : 150000;
    const totalPrice = pricePerTicket * parseInt(quantity);

    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price: stripeId,
        quantity: parseInt(quantity),
      }],
      mode: 'payment',
      payment_method_types: ['card'],
      success_url: `${DOMAIN}/success2?session_id={CHECKOUT_SESSION_ID}&ticketType=${encodeURIComponent(ticketType)}&visitDate=${encodeURIComponent(visitDate)}&quantity=${encodeURIComponent(quantity)}&totalPrice=${encodeURIComponent(totalPrice)}`,
      cancel_url: `${DOMAIN}/cancel`
    });

    res.json({ sessionUrl: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).send('Internal Server Error');
  }
});



app.get('/success2', async (req, res) => {
  try {
    const { session_id, ticketType, visitDate, quantity, totalPrice } = req.query;
    if (!session_id) {
      return res.status(400).send('Session ID is required');
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session && session.payment_status === 'paid') {
      const newTicket = new Ticket({
        ticketType,
        visitDate: new Date(visitDate),
        quantity: parseInt(quantity),
        totalPrice: parseInt(totalPrice),
        user: req.session.user._id
      });

      await newTicket.save();
      res.send('Pembayaran berhasil. Tiket telah dikonfirmasi.');
    } else {
      res.send('Pembayaran tidak berhasil. Tidak ada tiket yang disimpan.');
    }
  } catch (error) {
    console.error('Error verifying payment and updating ticket:', error);
    res.status(500).send('Internal Server Error');
  }
});






app.post('/webhook', async (req, res) => {
  let data;
  let eventType;
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    let event;
    let signature = req.headers['stripe-signature'];

    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`);
      return res.sendStatus(400);
    }
    // Extract the object from the event.
    data = event.data;
    eventType = event.type;
  } else {
    data = req.body.data;
    eventType = req.body.type;
  }

  if (eventType === 'checkout.session.completed') {
    console.log(`🔔  Payment received!`);
  }

  res.sendStatus(200);
});

app.get('/adminuser', async (req, res) => {
  try {
      const users = await User.find({});
      res.render('adminuser.ejs',{users,layout:false,moment}); 
  } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).send('Error fetching users');
  }
});

// Route untuk menghapus pengguna
app.delete('/user/:id', async (req, res) => {
try {
    const user = await User.findById(req.params.id);
    if (!user) {
        return res.status(404).send('User not found');
    }

    // Cek jika pengguna adalah admin dan mencegah penghapusan
    if (user.isAdmin) {
        return res.status(403).send('Cannot delete an admin user');
    }

    await User.findByIdAndDelete(req.params.id);
    res.send('User deleted successfully');
} catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).send('Error deleting user');
}
});

app.get('/admincart', async (req, res) => {
try {
    const products = await Product.find({}); // Mengambil semua produk
    res.render('admincart.ejs', { products ,layout:false}); // Mengirim produk ke template EJS
} catch (error) {
    console.error('Failed to fetch products:', error);
    res.status(500).send('Error fetching products');
}
});

app.post('/sales', async (req, res) => {
try {
    const { name, image, price, stripeId } = req.body;
    const newProduct = new Product({ name, image, price, stripeId });
    await newProduct.save();
    res.redirect('/admincart'); // Redirect kembali ke halaman sales setelah penambahan
} catch (error) {
    console.error('Failed to add product:', error);
    res.status(500).send('Error adding product');
}
});

// Handle POST request for product updates
// Server.js
app.post('/sales/edit/:productId', async (req, res) => {
try {
    const { name, image, price, stripeId } = req.body;
    await Product.findByIdAndUpdate(req.params.productId, {
        name: name,
        image: image,
        price: price,
        stripeId: stripeId
    });
    res.json({ message: 'Product updated successfully' }); // Mengirim respons sukses
} catch (error) {
    console.error('Failed to update product:', error);
    res.status(500).send('Error updating product');
}
});


// Handle DELETE request for products
app.delete('/sales/:productId', async (req, res) => {
try {
    await Product.findByIdAndDelete(req.params.productId);
    res.json({ message: 'Product deleted successfully' });
} catch (error) {
    console.error('Failed to delete product:', error);
    res.status(500).json({ message: 'Error deleting product' });
}
});

app.get("/adminmessage", async (req, res) => {
if (!req.session.user || !req.session.user.isAdmin) {
  return res.status(403).send("Unauthorized access.");
}

try {
  const messages = await Message.find({ sender: req.session.user._id }).populate('recipients');
  res.render("adminmessage.ejs", { messages, layout: false });
} catch (error) {
  console.error("Error retrieving messages:", error);
  res.status(500).send("Internal Server Error");
}
});


app.post('/send-message', async (req, res) => {
if (!req.session.user || !req.session.user.isAdmin) {
    return res.status(403).send('Unauthorized');
}

try {
    const { subject, body } = req.body;
    const allUsers = await User.find({ _id: { $ne: req.session.user._id }}); // Ambil semua user kecuali admin

    const message = new Message({
        subject,
        body,
        sender: req.session.user._id,
        recipients: allUsers.map(user => user._id)
    });

    await message.save();
    res.redirect('/adminmessage')
} catch (error) {
    console.error('Error sending message:', error);
    res.status(500).send('Internal Server Error');
}
});

app.get('/inbox', async (req, res) => {
const user = req.session.user;
if (!req.session.user) {
    return res.redirect('/login');
}

try {
    const messages = await Message.find({ recipients: req.session.user._id })
        .populate('sender', 'email');
    res.render('inbox.ejs', { messages, layout:false,title:'Inbox',user:user});
} catch (error) {
    console.error('Error retrieving messages:', error);
    res.status(500).send('Internal Server Error: ' + error.message);  // Providing more detail about the error
}
});

app.delete('/delete-message/:id', async (req, res) => {
if (!req.session.user || !req.session.user.isAdmin) {
    return res.status(403).send('Unauthorized');
}

try {
    await Message.findByIdAndDelete(req.params.id);
    res.send({ status: 'success', message: 'Pesan berhasil dihapus.' });
} catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).send({ status: 'error', message: 'Internal Server Error' });
}
});

app.get('/profil', async (req, res) => {
  const user = req.session.user;
  if (!user) {
      return res.redirect('/login'); // Redirect to login if the user is not logged in
  }

  const sortOption = req.query.sort || 'date-desc'; // Default sorting
  let sortParams = {};

  switch(sortOption) {
      case 'date-desc':
          sortParams = { visitDate: -1 };
          break;
      case 'date-asc':
          sortParams = { visitDate: 1 };
          break;
      case 'price-desc':
          sortParams = { totalPrice: -1 };
          break;
      case 'price-asc':
          sortParams = { totalPrice: 1 };
          break;
  }

  try {
      const tickets = await Ticket.find({ user: user._id })
                                 .sort(sortParams);
      res.render('profil.ejs', { tickets, layout: false, title: 'Profil', moment, user: user });
  } catch (error) {
      console.error('Error fetching user tickets:', error);
      res.status(500).send('Internal Server Error');
  }
});


app.post('/api/tickets', async (req, res) => {
try {
    // Pastikan user sudah login
    if (!req.session.user) {
        return res.status(401).json({ message: 'User not authenticated' });
    }

    const { ticketType, visitDate, quantity } = req.body;
    const pricePerTicket = ticketType === 'Premium' ? 300000 : 150000;
    const totalPrice = pricePerTicket * parseInt(quantity);

    // Membuat dokumen tiket baru
    const newTicket = new Ticket({
        ticketType,
        visitDate,
        quantity,
        totalPrice,
        user: req.session.user._id  // Simpan referensi ke user yang login
    });

    // Simpan tiket ke database
    await newTicket.save();

    res.status(200).json({ message: 'Ticket successfully purchased', ticketId: newTicket._id });
} catch (error) {
    console.error('Failed to process ticket purchase:', error);
    res.status(500).json({ message: 'Internal Server Error' });
}
});


app.listen(port,() => {
  console.log(`Webserver listening on port ${port}`)
});

