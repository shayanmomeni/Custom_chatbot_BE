const basicAuth = require("basic-auth");

const swaggerAuth = (req, res, next) => {
  const user = basicAuth(req);
  const username = process.env.SWAGGER_USER;
  const password = process.env.SWAGGER_PASS;

  if (!user || user.name !== username || user.pass !== password) {
    res.set("WWW-Authenticate", 'Basic realm="Swagger Docs"');
    return res.status(401).send("Authentication required.");
  }

  next();
};

module.exports = swaggerAuth;
