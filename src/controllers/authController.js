const authService = require('../services/authService');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`Controller: Intento de login para email: ${email}`);
    
    const result = await authService.login(email, password);
    console.log(`Controller: Login exitoso para: ${email}`);
    
    res.json(result);
  } catch (error) {
    console.error(`Controller: Error en login:`, error);
    
    // Enviar una respuesta de error más detallada
    res.status(401).json({ 
      message: "Invalid credentials", 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { email, name, googleId } = req.body;
    console.log(`Controller: Intento de Google login para: ${email}`);
    
    const result = await authService.googleLogin(email, name, googleId);
    console.log(`Controller: Google login exitoso para: ${email}`);
    
    res.json(result);
  } catch (error) {
    console.error(`Controller: Error en Google login:`, error);
    
    res.status(401).json({ 
      message: "Authentication failed", 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  login,
  googleLogin
};
