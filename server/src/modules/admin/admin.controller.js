const prisma = require('../../lib/prisma');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function getSuperAdminId() {
  const oldestAdmin = await prisma.admin.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true }
  });
  return oldestAdmin?.id;
}

async function getAdmins(req, res, next) {
  try {
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' }
    });
    
    const superAdminId = admins.length > 0 ? admins[0].id : null;
    const isCurrentUserSuperAdmin = req.admin.sub === superAdminId;

    res.json({ success: true, admins, isSuperAdmin: isCurrentUserSuperAdmin, superAdminId });
  } catch (error) {
    next(error);
  }
}

async function createAdmin(req, res, next) {
  try {
    const superAdminId = await getSuperAdminId();
    if (req.admin.sub !== superAdminId) {
      return res.status(403).json({ success: false, message: 'Only the Super Admin can create new accounts' });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Check if exists
    const existing = await prisma.admin.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Admin with this email already exists' });
    }

    // Generate random 10-char password
    const rawPassword = crypto.randomBytes(5).toString('hex');
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const newAdmin = await prisma.admin.create({
      data: {
        email,
        passwordHash
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      }
    });

    res.status(201).json({
      success: true,
      admin: newAdmin,
      temporaryPassword: rawPassword // Send back only once!
    });
  } catch (error) {
    next(error);
  }
}

async function deleteAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const currentAdminId = req.admin.sub;

    const superAdminId = await getSuperAdminId();
    if (currentAdminId !== superAdminId) {
      return res.status(403).json({ success: false, message: 'Only the Super Admin can delete accounts' });
    }

    if (id === currentAdminId) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    if (id === superAdminId) {
      return res.status(400).json({ success: false, message: 'The Super Admin account cannot be deleted' });
    }

    await prisma.admin.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Admin deleted successfully' });
  } catch (error) {
    next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.admin.sub;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new passwords are required' });
    }

    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect current password' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await prisma.admin.update({
      where: { id: adminId },
      data: { passwordHash: newPasswordHash }
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAdmins,
  createAdmin,
  deleteAdmin,
  changePassword
};
