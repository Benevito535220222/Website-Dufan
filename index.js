if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const express = require('express');
const bcrypt = require('bcrypt');
const User = require('./model/config');
const Product =require ('./model/produk');
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
     const existingUser = await User.findOne({ email: req.body.email });
     if (existingUser) {
       return res.send('<script>alert("Email sudah terdaftar!"); window.location.href = "/register";</script>');
     }
     const hashedPassword = await bcrypt.hash(req.body.password, 10);
     const newUser = new User({
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
       

       req.session.user = user; 

       res.redirect('/');
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


  app.post('/webhook', async (req, res) => {
    let data;
    let eventType;
    // Check if webhook signing is configured.
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      // Retrieve the event by verifying the signature using the raw body and secret.
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
      // Webhook signing is recommended, but if the secret is not configured in `config.js`,
      // retrieve the event data directly from the request body.
      data = req.body.data;
      eventType = req.body.type;
    }
  
    if (eventType === 'checkout.session.completed') {
      console.log(`🔔  Payment received!`);
    }
  
    res.sendStatus(200);
  });

app.listen(port,() => {
    console.log(`Webserver listening on port ${port}`)
 });