import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Plus, Trash2, KeyRound, Copy } from 'lucide-react';
import api from '../../lib/api';
import useAppStore from '../../stores/useAppStore';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';

export default function Settings() {
  const [admins, setAdmins] = useState([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const addToast = useAppStore(state => state.addToast);
  const { admin } = useAuth();

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Forms
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const res = await api.get('/admin/users');
      setAdmins(res.admins);
      setIsSuperAdmin(res.isSuperAdmin);
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to load admins' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/users', { email: newAdminEmail });
      setAdmins([res.admin, ...admins]);
      setTempPassword(res.temporaryPassword);
      addToast({ type: 'success', title: 'Success', message: 'Admin account created' });
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const handleDeleteAdmin = async (id) => {
    if (!window.confirm('Are you sure you want to delete this admin account?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setAdmins(admins.filter(a => a.id !== id));
      addToast({ type: 'success', title: 'Deleted', message: 'Admin removed successfully' });
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return addToast({ type: 'error', title: 'Error', message: 'New passwords do not match' });
    }
    try {
      await api.put('/admin/users/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      addToast({ type: 'success', title: 'Success', message: 'Password changed successfully' });
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tempPassword);
    addToast({ type: 'info', title: 'Copied', message: 'Password copied to clipboard' });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2 uppercase">
          <SettingsIcon className="w-6 h-6 text-primary-600" /> System Settings
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Manage administrator accounts and system preferences.</p>
      </div>

      <div className="bg-white dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 rounded-md shadow-brutal dark:shadow-brutal-dark overflow-hidden">
        <div className="px-6 py-4 border-b-2 border-neutral-900 dark:border-neutral-700 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900">
          <div>
            <h2 className="text-lg font-black text-neutral-900 dark:text-white uppercase">Administrator Accounts</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Users with full access to this system.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" icon={KeyRound} onClick={() => setShowPasswordModal(true)}>Change My Password</Button>
            {isSuperAdmin && (
              <Button icon={Plus} onClick={() => { setShowCreateModal(true); setTempPassword(''); setNewAdminEmail(''); }}>Add Admin</Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-neutral-900 dark:text-white">
            <thead className="bg-neutral-50 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 uppercase text-xs border-b-2 border-neutral-900 dark:border-neutral-700">
              <tr>
                <th className="px-6 py-3 font-black">Email</th>
                <th className="px-6 py-3 font-black">Created At</th>
                <th className="px-6 py-3 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-neutral-900 dark:divide-neutral-700">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={`skel-${i}`}>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-48" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-24" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-8 inline-block" /></td>
                  </tr>
                ))
              ) : admins.map(a => (
                <tr key={a.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                  <td className="px-6 py-4 font-bold text-neutral-900 dark:text-white">
                    {a.email}
                    {a.id === admin?.sub && <span className="ml-2 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-md border-2 border-neutral-900 dark:border-neutral-700 font-black">You</span>}
                  </td>
                  <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400">{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    {isSuperAdmin && a.id !== admin?.sub && (
                      <button 
                        onClick={() => handleDeleteAdmin(a.id)}
                        className="text-danger-600 hover:text-danger-700 dark:text-danger-400 dark:hover:text-danger-300 hover:bg-danger-50 dark:hover:bg-danger-900/30 p-1.5 rounded-md transition-colors"
                        title="Delete Admin"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE ADMIN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-neutral-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-md border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b-2 border-neutral-900 dark:border-neutral-700 flex justify-between items-center">
              <h3 className="text-lg font-black text-neutral-900 dark:text-white uppercase">Add New Administrator</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">&times;</button>
            </div>
            
            {tempPassword ? (
              <div className="p-6 space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 p-4 rounded-md border-2 border-neutral-900 dark:border-neutral-700">
                  <h4 className="font-black mb-1">Account Created Successfully!</h4>
                  <p className="text-sm mb-3 dark:text-emerald-400">Please copy the temporary password below and give it to the new administrator. They should change it upon logging in.</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white dark:bg-neutral-900 px-3 py-2 rounded-md border-2 border-neutral-900 dark:border-neutral-700 font-mono text-lg text-center select-all text-neutral-900 dark:text-white">{tempPassword}</code>
                    <Button onClick={copyToClipboard} variant="secondary" icon={Copy} className="shrink-0" />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={() => setShowCreateModal(false)}>Done</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateAdmin} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-black text-neutral-900 dark:text-white mb-1 uppercase tracking-wider">Email Address</label>
                  <input 
                    type="email" 
                    required 
                    className="w-full px-3 py-2 border-2 border-neutral-900 dark:border-neutral-500 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-bold focus:outline-none focus:border-primary-500 transition-all"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t-2 border-neutral-900 dark:border-neutral-700">
                  <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                  <Button type="submit">Create Account</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-neutral-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-md border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b-2 border-neutral-900 dark:border-neutral-700 flex justify-between items-center">
              <h3 className="text-lg font-black text-neutral-900 dark:text-white uppercase">Change My Password</h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">&times;</button>
            </div>
            
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-black text-neutral-900 dark:text-white mb-1 uppercase tracking-wider">Current Password</label>
                <input 
                  type="password" 
                  required 
                  className="w-full px-3 py-2 border-2 border-neutral-900 dark:border-neutral-500 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-bold focus:outline-none focus:border-primary-500"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-black text-neutral-900 dark:text-white mb-1 uppercase tracking-wider">New Password</label>
                <input 
                  type="password" 
                  required 
                  className="w-full px-3 py-2 border-2 border-neutral-900 dark:border-neutral-500 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-bold focus:outline-none focus:border-primary-500"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-black text-neutral-900 dark:text-white mb-1 uppercase tracking-wider">Confirm New Password</label>
                <input 
                  type="password" 
                  required 
                  className="w-full px-3 py-2 border-2 border-neutral-900 dark:border-neutral-500 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-bold focus:outline-none focus:border-primary-500"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t-2 border-neutral-900 dark:border-neutral-700">
                <Button type="button" variant="secondary" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
                <Button type="submit">Update Password</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
