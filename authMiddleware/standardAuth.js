export default (db) => async (req, res, next) => {
  const result = await db
    .collection("auth")
    .findOne({ authtoken: req.body.authtoken });
  var username = "";
  var authtoken = "";
  var authed = await (async () => {
    if (!result) {
      return Promise.resolve(false);
    }
    username = result.loginName;
    authtoken = result.authtoken;
    return Promise.resolve(true);
  })();

  if (!authed) {
    res.send({ authed: authed, error: "Invalid authtoken", username: "" });
    return;
  }

  req.user = result;

  return next();
}