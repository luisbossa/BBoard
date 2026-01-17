const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const token = req.cookies.auth_token;

  if (!token) {
    return res.redirect("/"); 
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      res.clearCookie("auth_token");
      return res.redirect("/"); 
    }

    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
