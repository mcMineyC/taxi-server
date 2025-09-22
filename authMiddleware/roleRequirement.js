export default (db, roles) => async (req, res, next) => {
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

  var parsedRoles = []
  
  if(roles && Array.isArray(roles) && roles.length > 0 ) {
    parsedRoles = roles.map(r => r.toLowerCase());
  }else{
    parsedRoles = roles;
  }
  
  if(!parsedRoles.some(r => result.roles.includes(r)) ) {
      res.send({ authed: false, error: "Insufficient permissions", username: "" });
      return;
  }

  req.user = result;

  return next();
}