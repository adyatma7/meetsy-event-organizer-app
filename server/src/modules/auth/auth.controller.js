const authService = require('./auth.service');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const result = await authService.adminLogin(email, password);

    res.json({
      success: true,
      token: result.token
    });
  } catch (error) {
    // If invalid email or password, return 401
    if (error.message === 'Invalid email or password') {
      return res.status(401).json({
        success: false,
        message: error.message
      });
    }
    // Otherwise pass to global error handler
    next(error);
  }
}

module.exports = {
  login
};
