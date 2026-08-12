import React from 'react';
import { localizedDisplay } from '../../Utils/locale';

export interface UserManagementModalsProps {
    auth_user: any;
    roles: any[];
    posts: any[];
    language: 'en' | 'id';
    t: any;
    
    editingUser: any;
    closeEditUser: () => void;
    submitEditUser: (e: React.FormEvent) => void;
    editName: string;
    setEditName: (v: string) => void;
    editRole: string;
    setEditRole: (v: string) => void;
    editPostId: string;
    setEditPostId: (v: string) => void;
    editLoginMethod: 'PASSWORD' | 'PIN';
    setEditLoginMethod: (v: 'PASSWORD' | 'PIN') => void;
    editUsername: string;
    setEditUsername: (v: string) => void;
    editPassword: string;
    setEditPassword: (v: string) => void;
    editPin: string;
    setEditPin: (v: string) => void;
    editSubmitting: boolean;
    handleDeleteUser: (user: any) => void;

    showAddUserModal: boolean;
    setShowAddUserModal: (v: boolean) => void;
    submitAddUser: (e: React.FormEvent) => void;
    newUserName: string;
    setNewUserName: (v: string) => void;
    newUserRoleId: number | null;
    setNewUserRoleId: (v: number | null) => void;
    newUserPostId: string;
    setNewUserPostId: (v: string) => void;
    newUserLoginMethod: 'PASSWORD' | 'PIN';
    setNewUserLoginMethod: (v: 'PASSWORD' | 'PIN') => void;
    newUserUsername: string;
    setNewUserUsername: (v: string) => void;
    newUserPassword: string;
    setNewUserPassword: (v: string) => void;
    newUserPasswordConfirmation: string;
    setNewUserPasswordConfirmation: (v: string) => void;
    newUserPin: string;
    setNewUserPin: (v: string) => void;
    addUserSubmitting: boolean;

    showAddAdminModal: boolean;
    setShowAddAdminModal: (v: boolean) => void;
    submitAddAdmin: (e: React.FormEvent) => void;
    adminName: string;
    setAdminName: (v: string) => void;
    adminRoleId: number | null;
    setAdminRoleId: (v: number | null) => void;
    adminPostId: number | null;
    setAdminPostId: (v: number | null) => void;
    adminUsername: string;
    setAdminUsername: (v: string) => void;
    adminPassword: string;
    setAdminPassword: (v: string) => void;
    adminPasswordConfirmation: string;
    setAdminPasswordConfirmation: (v: string) => void;
    adminSubmitting: boolean;
}

export function UserManagementModals({
    auth_user,
    roles,
    posts,
    language,
    t,
    editingUser,
    closeEditUser,
    submitEditUser,
    editName,
    setEditName,
    editRole,
    setEditRole,
    editPostId,
    setEditPostId,
    editLoginMethod,
    setEditLoginMethod,
    editUsername,
    setEditUsername,
    editPassword,
    setEditPassword,
    editPin,
    setEditPin,
    editSubmitting,
    handleDeleteUser,
    showAddUserModal,
    setShowAddUserModal,
    submitAddUser,
    newUserName,
    setNewUserName,
    newUserRoleId,
    setNewUserRoleId,
    newUserPostId,
    setNewUserPostId,
    newUserLoginMethod,
    setNewUserLoginMethod,
    newUserUsername,
    setNewUserUsername,
    newUserPassword,
    setNewUserPassword,
    newUserPasswordConfirmation,
    setNewUserPasswordConfirmation,
    newUserPin,
    setNewUserPin,
    addUserSubmitting,
    showAddAdminModal,
    setShowAddAdminModal,
    submitAddAdmin,
    adminName,
    setAdminName,
    adminRoleId,
    setAdminRoleId,
    adminPostId,
    setAdminPostId,
    adminUsername,
    setAdminUsername,
    adminPassword,
    setAdminPassword,
    adminPasswordConfirmation,
    setAdminPasswordConfirmation,
    adminSubmitting,
}: UserManagementModalsProps) {
    return (
        <>
            {/* ── Edit User Modal (Task 1b / 1c / 1d) ────────────────────── */}
            {editingUser && (
                <div
                    id="edit-user-modal"
                    className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[60] p-5"
                    onClick={e => { if (e.target === e.currentTarget) closeEditUser(); }}
                >
                    <div className="bg-pg-card border border-white/8 rounded-2xl p-6 shadow-2xl w-full max-w-[460px] max-h-[90vh] overflow-y-auto">
                        {/* Modal header */}
                        <div className="flex justify-between items-start mb-5">
                            <div>
                                <h2 className="text-lg font-extrabold m-0 mb-1">{t.edit_user}</h2>
                                <p className="text-xs text-pg-text-muted m-0">{editingUser.name}</p>
                            </div>
                            <button
                                onClick={closeEditUser}
                                className="bg-transparent border-none text-pg-text-muted text-xl cursor-pointer leading-none px-1"
                            >×</button>
                        </div>

                        <form onSubmit={submitEditUser}>
                            {/* Name */}
                            <div className="mb-3.5">
                                <label className="block text-xs text-pg-text-secondary mb-1.5 font-semibold">
                                    {t.user_name_label}
                                </label>
                                <input
                                    id="edit-user-name"
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    required
                                    className="w-full p-2.5 px-3 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none box-border"
                                />
                            </div>

                            {/* Role */}
                            <div className="mb-3.5">
                                <label className="block text-xs text-pg-text-secondary mb-1.5 font-semibold">
                                    {t.user_role_label}
                                </label>
                                <select
                                    id="edit-user-role"
                                    value={editRole}
                                    onChange={e => setEditRole(e.target.value)}
                                    disabled={editingUser.is_owner}
                                    className="w-full p-2.5 px-3 bg-pg-bg border border-white/8 rounded-lg text-sm outline-none box-border"
                                    style={{ color: editingUser.is_owner ? 'var(--color-pg-text-muted)' : '#fff' }}
                                >
                                    {(roles ?? []).map(r => (
                                        <option key={r.id} value={r.id}>{localizedDisplay(r, language)} ({r.name})</option>
                                    ))}
                                </select>
                                {editingUser.is_owner && (
                                    <p className="text-[11px] text-pg-text-muted mt-1 m-0">Owner role cannot be changed.</p>
                                )}
                            </div>

                            {/* Post */}
                            <div className="mb-3.5">
                                <label className="block text-xs text-pg-text-secondary mb-1.5 font-semibold">
                                    Post
                                </label>
                                <select
                                    id="edit-user-post"
                                    value={editPostId}
                                    onChange={e => setEditPostId(e.target.value)}
                                    disabled={editingUser.is_owner}
                                    className="w-full p-2.5 px-3 bg-pg-bg border border-white/8 rounded-lg text-sm outline-none box-border"
                                    style={{ color: editingUser.is_owner ? 'var(--color-pg-text-muted)' : '#fff' }}
                                >
                                    <option value="">-- No post --</option>
                                    {(posts ?? []).map(p => (
                                        <option key={p.id} value={p.id}>{localizedDisplay(p, language)} ({p.name})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Login Method toggle */}
                            <div className="mb-3.5">
                                <label className="block text-xs text-pg-text-secondary mb-2 font-semibold">
                                    {t.user_login_label}
                                </label>
                                <div className="flex gap-2">
                                    {(['PASSWORD', 'PIN'] as const).map(method => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setEditLoginMethod(method)}
                                            className="flex-1 py-2 rounded-lg border text-xs font-bold cursor-pointer"
                                            style={{
                                                borderColor: editLoginMethod === method ? '#3b82f6' : 'var(--color-pg-border)',
                                                backgroundColor: editLoginMethod === method ? 'rgba(59,130,246,0.15)' : 'var(--color-pg-surface)',
                                                color: editLoginMethod === method ? '#3b82f6' : 'var(--color-pg-text-secondary)',
                                            }}
                                        >
                                            {method === 'PASSWORD' ? '🔑 ' + t.login_method_password : '🔢 ' + t.login_method_pin}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* PASSWORD fields */}
                            {editLoginMethod === 'PASSWORD' && (
                                <>
                                    <div className="mb-3.5">
                                        <label className="block text-xs text-pg-text-secondary mb-1.5 font-semibold">
                                            {t.admin_username}
                                        </label>
                                        <input
                                            id="edit-user-username"
                                            type="text"
                                            value={editUsername}
                                            onChange={e => setEditUsername(e.target.value)}
                                            required
                                            className="w-full p-2.5 px-3 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none box-border"
                                        />
                                    </div>
                                    <div className="mb-3.5">
                                        <label className="block text-xs text-pg-text-secondary mb-1.5 font-semibold">
                                            {t.new_password_label}
                                        </label>
                                        <input
                                            id="edit-user-password"
                                            type="password"
                                            value={editPassword}
                                            onChange={e => setEditPassword(e.target.value)}
                                            minLength={6}
                                            placeholder="••••••••"
                                            className="w-full p-2.5 px-3 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none box-border"
                                        />
                                    </div>
                                </>
                            )}
                            
                            {/* PIN field */}
                            {editLoginMethod === 'PIN' && (
                                <div className="mb-3.5">
                                    <label className="block text-xs text-pg-text-secondary mb-1.5 font-semibold">
                                        {t.new_pin_label}
                                    </label>
                                    <input
                                        id="edit-user-pin"
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={editPin}
                                        onChange={e => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        minLength={4}
                                        maxLength={6}
                                        placeholder="e.g. 1234"
                                        className="w-full p-2.5 px-3 bg-pg-bg border border-white/8 rounded-lg text-white text-lg outline-none box-border"
                                        style={{ letterSpacing: '0.3em' }}
                                    />
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex gap-2.5 mt-5 flex-wrap">
                                {/* Delete — only if not self */}
                                {editingUser.id !== auth_user?.id && (
                                    <button
                                        type="button"
                                        id={`delete-user-${editingUser.id}`}
                                        onClick={() => handleDeleteUser(editingUser)}
                                        className="px-4 py-2.5 bg-red-500/10 border border-red-500/25 text-red-500 rounded-lg font-semibold text-sm cursor-pointer"
                                    >
                                        🗑️ {t.delete_user}
                                    </button>
                                )}
                                <div className="flex-1" />
                                <button
                                    type="button"
                                    onClick={closeEditUser}
                                    className="px-4 py-2.5 bg-pg-surface border border-pg-border text-pg-text rounded-lg font-semibold text-sm cursor-pointer"
                                >
                                    {t.cancel}
                                </button>
                                <button
                                    type="submit"
                                    id={`save-user-${editingUser.id}`}
                                    disabled={editSubmitting}
                                    className="px-5 py-2.5 border-none text-white rounded-xl font-semibold text-sm"
                                    style={{
                                        background: editSubmitting ? '#4f46e5' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                        cursor: editSubmitting ? 'not-allowed' : 'pointer',
                                        opacity: editSubmitting ? 0.7 : 1,
                                    }}
                                >
                                    {editSubmitting ? '...' : t.save_user}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add User Modal */}
            {showAddUserModal && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[50] p-5">
                    <div className="bg-pg-card border border-white/8 rounded-2xl p-6 shadow-2xl w-full max-w-[420px] max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-extrabold m-0 mb-2">
                            {t.add_user_title}
                        </h2>
                        <p className="text-sm text-pg-text-muted m-0 mb-6">
                            {t.add_user_subtitle}
                        </p>

                        <form onSubmit={submitAddUser}>
                            <div className="mb-4">
                                <label className="block text-sm text-pg-text-secondary mb-1.5 font-semibold">
                                    {t.user_name_label}
                                </label>
                                <input
                                    type="text"
                                    value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                    required
                                    placeholder="e.g. John Doe"
                                    className="w-full p-2.5 px-3.5 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none box-border"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm text-pg-text-secondary mb-1.5 font-semibold">
                                    {t.user_role_label}
                                </label>
                                <select
                                    value={newUserRoleId ?? ''}
                                    onChange={e => setNewUserRoleId(Number(e.target.value))}
                                    className="w-full p-2.5 px-3.5 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none"
                                >
                                    <option value="">-- Select role --</option>
                                    {(roles ?? []).map(r => (
                                        <option key={r.id} value={r.id}>{localizedDisplay(r, language)} ({r.name})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm text-pg-text-secondary mb-1.5 font-semibold">
                                    Post
                                </label>
                                <select
                                    value={newUserPostId}
                                    onChange={e => setNewUserPostId(e.target.value)}
                                    className="w-full p-2.5 px-3.5 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none"
                                >
                                    <option value="">-- No post --</option>
                                    {(posts ?? []).map(p => (
                                        <option key={p.id} value={p.id}>{localizedDisplay(p, language)} ({p.name})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="block text-xs text-pg-text-secondary mb-2 font-semibold">
                                    {t.user_login_label}
                                </label>
                                <div className="flex gap-2">
                                    {(['PASSWORD', 'PIN'] as const).map(method => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setNewUserLoginMethod(method)}
                                            className="flex-1 py-2 rounded-lg border text-xs font-bold cursor-pointer"
                                            style={{
                                                borderColor: newUserLoginMethod === method ? '#3b82f6' : 'var(--color-pg-border)',
                                                backgroundColor: newUserLoginMethod === method ? 'rgba(59,130,246,0.15)' : 'var(--color-pg-surface)',
                                                color: newUserLoginMethod === method ? '#3b82f6' : 'var(--color-pg-text-secondary)',
                                            }}
                                        >
                                            {method === 'PASSWORD' ? '🔑 ' + t.login_method_password : '🔢 ' + t.login_method_pin}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {newUserLoginMethod === 'PASSWORD' && (
                                <>
                                    <div className="mb-4">
                                        <label className="block text-sm text-pg-text-secondary mb-1.5 font-semibold">
                                            {t.admin_username}
                                        </label>
                                        <input
                                            type="text"
                                            value={newUserUsername}
                                            onChange={(e) => setNewUserUsername(e.target.value)}
                                            required
                                            placeholder="e.g. john.worker"
                                            className="w-full p-2.5 px-3.5 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none box-border"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-sm text-pg-text-secondary mb-1.5 font-semibold">
                                            {t.admin_password}
                                        </label>
                                        <input
                                            type="password"
                                            value={newUserPassword}
                                            onChange={(e) => setNewUserPassword(e.target.value)}
                                            required
                                            minLength={8}
                                            placeholder="••••••••"
                                            className="w-full p-2.5 px-3.5 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none box-border"
                                        />
                                        <span className="block text-[11px] text-pg-text-muted mt-1 leading-normal">
                                            {t.password_desc}
                                        </span>
                                    </div>

                                    <div className="mb-6">
                                        <label className="block text-sm text-pg-text-secondary mb-1.5 font-semibold">
                                            {t.confirm_password}
                                        </label>
                                        <input
                                            type="password"
                                            value={newUserPasswordConfirmation}
                                            onChange={(e) => setNewUserPasswordConfirmation(e.target.value)}
                                            required
                                            minLength={8}
                                            placeholder="••••••••"
                                            className="w-full p-2.5 px-3.5 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none box-border"
                                        />
                                    </div>
                                </>
                            )}
                            
                            {newUserLoginMethod === 'PIN' && (
                                <div className="mb-6">
                                    <label className="block text-sm text-pg-text-secondary mb-1.5 font-semibold">
                                        {t.new_pin_label}
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={newUserPin}
                                        onChange={e => setNewUserPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        required
                                        minLength={4}
                                        maxLength={6}
                                        placeholder="e.g. 1234"
                                        className="w-full p-2.5 px-3.5 bg-pg-bg border border-white/8 rounded-lg text-white text-lg outline-none box-border"
                                        style={{ letterSpacing: '0.3em' }}
                                    />
                                </div>
                            )}

                            <div className="flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowAddUserModal(false)}
                                    className="px-4 py-2.5 bg-pg-surface border border-pg-border text-pg-text rounded-lg font-semibold cursor-pointer"
                                >
                                    {t.cancel}
                                </button>
                                <button
                                    type="submit"
                                    disabled={addUserSubmitting}
                                    className="px-5 py-2.5 border-none text-white rounded-xl font-semibold"
                                    style={{
                                        background: addUserSubmitting ? '#4f46e5' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                        cursor: addUserSubmitting ? 'not-allowed' : 'pointer',
                                        opacity: addUserSubmitting ? 0.7 : 1,
                                    }}
                                >
                                    {addUserSubmitting ? '...' : t.add_user}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Admin Modal */}
            {showAddAdminModal && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[50] p-5">
                    <div className="bg-pg-card border border-white/8 rounded-2xl p-6 shadow-2xl w-full max-w-[420px]">
                        <h2 className="text-xl font-extrabold m-0 mb-2">
                            {t.create_admin}
                        </h2>
                        <p className="text-sm text-pg-text-muted m-0 mb-6">
                            {t.admin_subtitle}
                        </p>

                        <form onSubmit={submitAddAdmin}>
                            <div className="mb-4">
                                <label className="block text-sm text-pg-text-secondary mb-1.5 font-semibold">
                                    {t.admin_name}
                                </label>
                                <input
                                    type="text"
                                    value={adminName}
                                    onChange={(e) => setAdminName(e.target.value)}
                                    required
                                    placeholder="e.g. Joko Widodo"
                                    className="w-full p-2.5 px-3.5 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none"
                                />
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-sm text-pg-text-secondary mb-1.5 font-semibold">
                                    Role
                                </label>
                                <select
                                    value={adminRoleId ?? ''}
                                    onChange={e => setAdminRoleId(Number(e.target.value))}
                                    className="w-full p-2.5 px-3.5 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none"
                                >
                                    <option value="">-- Select role --</option>
                                    {(roles ?? []).map(r => (
                                        <option key={r.id} value={r.id}>{localizedDisplay(r, language)} ({r.name})</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-sm text-pg-text-secondary mb-1.5 font-semibold">
                                    Post
                                </label>
                                <select
                                    id="add-admin-post"
                                    value={adminPostId ?? ''}
                                    onChange={e => setAdminPostId(Number(e.target.value))}
                                    className="w-full p-2.5 px-3.5 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none"
                                >
                                    <option value="">-- Select post --</option>
                                    {(posts ?? []).map(p => (
                                        <option key={p.id} value={p.id}>{localizedDisplay(p, language)} ({p.name})</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-sm text-pg-text-secondary mb-1.5 font-semibold">
                                    {t.admin_username}
                                </label>
                                <input
                                    type="text"
                                    value={adminUsername}
                                    onChange={(e) => setAdminUsername(e.target.value)}
                                    required
                                    placeholder="e.g. joko.admin"
                                    className="w-full p-2.5 px-3.5 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none"
                                />
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-sm text-pg-text-secondary mb-1.5 font-semibold">
                                    {t.admin_password}
                                </label>
                                <input
                                    type="password"
                                    value={adminPassword}
                                    onChange={(e) => setAdminPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    placeholder="••••••••"
                                    className="w-full p-2.5 px-3.5 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none"
                                />
                                <span className="block text-[11px] text-pg-text-muted mt-1 leading-normal">
                                    {t.password_desc}
                                </span>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm text-pg-text-secondary mb-1.5 font-semibold">
                                    {t.confirm_password}
                                </label>
                                <input
                                    type="password"
                                    value={adminPasswordConfirmation}
                                    onChange={(e) => setAdminPasswordConfirmation(e.target.value)}
                                    required
                                    minLength={8}
                                    placeholder="••••••••"
                                    className="w-full p-2.5 px-3.5 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none"
                                />
                            </div>
                            
                            <div className="flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowAddAdminModal(false)}
                                    className="px-4 py-2.5 bg-pg-surface border border-pg-border text-pg-text rounded-lg font-semibold cursor-pointer"
                                >
                                    {t.cancel}
                                </button>
                                <button
                                    type="submit"
                                    disabled={adminSubmitting}
                                    className="px-5 py-2.5 border-none text-white rounded-xl font-semibold"
                                    style={{
                                        background: adminSubmitting ? '#4f46e5' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                        cursor: adminSubmitting ? 'not-allowed' : 'pointer',
                                        opacity: adminSubmitting ? 0.7 : 1,
                                    }}
                                >
                                    {adminSubmitting ? '...' : t.create_admin}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
