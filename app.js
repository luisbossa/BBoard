require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const expressLayouts = require("express-ejs-layouts");
const cookieParser = require("cookie-parser");

const app = express();

app.locals.process = {
  env: process.env,
};

app.locals.ONVO_PUBLIC_KEY = process.env.ONVOPAY_PUBLIC_KEY || "";

/* MIDDLEWARES */
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(expressLayouts);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("layout", "layouts/layout");

app.use(express.static(path.join(__dirname, "public")));

app.use("/", require("./routes/loginRoute"));
app.use("/dashboard", require("./routes/dashboardRoute"));
app.use("/", require("./routes/logoutRoute"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
