// Archivo: Aplicación/routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Usuario from '../models/Usuario.js'; // Importamos el modelo de usuario
import authMiddleware from '../middleware/auth.js'; // 


const router = express.Router();

// --- RUTA DE REGISTRO ---
// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { nombre, apellido, rut, email, password, role, ...rest } = req.body;

  try {
    // 1. Verificar si el usuario ya existe
    let user = await Usuario.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'El correo electrónico ya está registrado.' });
    }

    // 2. Crear el nuevo usuario
    user = new Usuario({
      nombre, apellido, rut, email, password, role, ...rest
    });

    // 3. Guardar en la base de datos (la contraseña se encriptará automáticamente)
    await user.save();

    res.status(201).json({ msg: 'Usuario registrado exitosamente.' });

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Error en el servidor');
  }
});

// --- RUTA DE LOGIN ---
// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Buscar si el usuario existe
        const user = await Usuario.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Credenciales inválidas.' });
        }

        // 2. Comparar la contraseña ingresada con la encriptada
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Credenciales inválidas.' });
        }

        // 3. Si todo es correcto, crear y firmar un JSON Web Token (JWT)
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET, // ¡Crea esta variable secreta en tu .env!
            { expiresIn: '5h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token }); // Enviamos el token al cliente
            }
        );

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

router.get('/', authMiddleware, async (req, res) => {
    try {
        // El middleware ya verificó el token y nos dio el ID del usuario en req.user.id
        const user = await Usuario.findById(req.user.id).select('-password'); // Busca al usuario por ID y excluye la contraseña
        res.json(user);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Error del Servidor' });
    }
});

// Ruta para actualizar el perfil del usuario autenticado
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.user.id);
        if (!usuario) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }

        // Actualizar los campos
        const { nombre, apellido, rut, email, fechaNacimiento, sexo, region, comuna, sector, tieneNegocio, negocios } = req.body;

        if (nombre) usuario.nombre = nombre;
        if (apellido) usuario.apellido = apellido;
        if (rut) usuario.rut = rut;
        if (email) usuario.email = email;
        if (fechaNacimiento) usuario.fechaNacimiento = fechaNacimiento;
        if (sexo) usuario.sexo = sexo;
        if (region) usuario.region = region;
        if (comuna) usuario.comuna = comuna;
        if (sector) usuario.sector = sector;
        
        // Actualizar negocios si el usuario es cliente
        if (tieneNegocio !== undefined) {
            usuario.tieneNegocio = tieneNegocio;
            if (negocios && Array.isArray(negocios)) {
                usuario.negocios = negocios;
            }
        }

        // Guardar los cambios
        await usuario.save();

        // Devolver el usuario actualizado sin el campo password
        res.json(await Usuario.findById(req.user.id).select('-password'));
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ msg: 'Error al actualizar el perfil', error: error.message });
    }
});
    // Ruta para actualizar el perfil de un usuario por ID (para administradores)
    router.put('/user/:userId', authMiddleware, async (req, res) => {
        try {
            const { userId } = req.params;
            const {
            nombre, apellido, rut, email, 
            fechaNacimiento, sexo, region, comuna, 
            sector, tieneNegocio, negocios
        } = req.body;

        // Buscar el usuario
        const usuario = await Usuario.findById(userId);
        if (!usuario) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }

        // Actualizar los campos
        if (nombre) usuario.nombre = nombre;
        if (apellido) usuario.apellido = apellido;
        if (rut) usuario.rut = rut;
        if (email) usuario.email = email;
        if (fechaNacimiento) usuario.fechaNacimiento = fechaNacimiento;
        if (sexo) usuario.sexo = sexo;
        if (region) usuario.region = region;
        if (comuna) usuario.comuna = comuna;
        if (sector) usuario.sector = sector;
        
        // Actualizar negocios si el usuario es cliente
        if (tieneNegocio !== undefined) {
            usuario.tieneNegocio = tieneNegocio;
            if (negocios && Array.isArray(negocios)) {
                usuario.negocios = negocios;
            }
        }

        // Guardar los cambios
        await usuario.save();

        res.json({ 
            msg: 'Perfil actualizado exitosamente',
            usuario: await Usuario.findById(userId).select('-password')
        });

    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ msg: 'Error al actualizar el perfil', error: error.message });
    }
});

export default router;