import { useState, useEffect } from 'react'
import { Button, Input, Select } from '../../components/ui'
import { settingsAPI, roomTypeAPI, expenseAPI, serviceAPI } from '../../api/endpoints'
import ConfirmModal from '../../components/modal/ConfirmModal'
import SuccessModal from '../../components/modal/SuccessModal'
import { useAppSelector } from '../../hooks/useRedux'

const ROLE_LABELS: Record<string, string> = { SUPER_ADMIN: 'Super Admin', DOCTOR: 'Doctor', RECEPTION: 'Reception' }


// Hospital Settings Tab
const HospitalSettings = () => {
  const [settings, setSettings] = useState({
    hospitalName: '',
    tagline: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    mobile: '',
    email: '',
    website: '',
    gstNumber: '',
    registrationNo: '',
    printHeader: '',
    printFooter: '',
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [successOpen, setSuccessOpen] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await settingsAPI.getHospital()
        if (res.data.data) {
          const d = res.data.data
          setSettings({
            hospitalName: d.name || '',
            tagline: d.tagline || '',
            address: d.address || '',
            city: d.city || '',
            state: d.state || '',
            pincode: d.pincode || '',
            phone: d.phone || '',
            mobile: d.mobile || '',
            email: d.email || '',
            website: d.website || '',
            gstNumber: d.gstNumber || '',
            registrationNo: d.registrationNo || '',
            printHeader: d.printHeader || '',
            printFooter: d.printFooter || '',
          })
          if (d.logo) setLogoPreview(d.logo)
        }
      } catch (err) {
        console.error('Failed to fetch hospital settings:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', settings.hospitalName)
      formData.append('tagline', settings.tagline)
      formData.append('address', settings.address)
      formData.append('city', settings.city)
      formData.append('state', settings.state)
      formData.append('pincode', settings.pincode)
      formData.append('phone', settings.phone)
      formData.append('mobile', settings.mobile)
      formData.append('email', settings.email)
      formData.append('website', settings.website)
      formData.append('gstNumber', settings.gstNumber)
      formData.append('registrationNo', settings.registrationNo)
      formData.append('printHeader', settings.printHeader)
      formData.append('printFooter', settings.printFooter)
      if (logoFile) formData.append('logo', logoFile)
      await settingsAPI.updateHospital(formData)
      setSuccessOpen(true)
    } catch (err) {
      console.error('Failed to save settings:', err)
      alert('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hospital Name *</label>
            <Input
              value={settings.hospitalName}
              onChange={(e) => setSettings({ ...settings, hospitalName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tagline</label>
            <Input
              value={settings.tagline}
              onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Address *</label>
            <Input
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">City *</label>
            <Input
              value={settings.city}
              onChange={(e) => setSettings({ ...settings, city: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">State *</label>
            <Input
              value={settings.state}
              onChange={(e) => setSettings({ ...settings, state: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pincode *</label>
            <Input
              value={settings.pincode}
              onChange={(e) => setSettings({ ...settings, pincode: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
            <Input
              value={settings.phone}
              onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
            <Input
              value={settings.mobile}
              onChange={(e) => setSettings({ ...settings, mobile: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <Input
              type="email"
              value={settings.email}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
            <Input
              value={settings.website}
              onChange={(e) => setSettings({ ...settings, website: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Legal Information */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Legal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">GST Number</label>
            <Input
              value={settings.gstNumber}
              onChange={(e) => setSettings({ ...settings, gstNumber: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Registration No.</label>
            <Input
              value={settings.registrationNo}
              onChange={(e) => setSettings({ ...settings, registrationNo: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Print Settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Print Settings</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Print Header (appears on bills/slips)</label>
            <textarea
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
              rows={3}
              value={settings.printHeader}
              onChange={(e) => setSettings({ ...settings, printHeader: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Print Footer (appears on bills/slips)</label>
            <textarea
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
              rows={2}
              value={settings.printFooter}
              onChange={(e) => setSettings({ ...settings, printFooter: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Logo Upload */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Hospital Logo</h3>
        <div className="flex items-start gap-6">
          <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden">
            {logoPreview ? (
              <img src={logoPreview} alt="Hospital Logo" className="w-full h-full object-contain" />
            ) : (
            <div className="text-center">
              <svg className="w-8 h-8 text-slate-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-slate-500">No logo</span>
            </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-600 mb-3">Upload your hospital logo. Recommended size: 200x200px. Supported formats: PNG, JPG.</p>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setLogoFile(file)
                    setLogoPreview(URL.createObjectURL(file))
                  }
                }}
              />
              <Button variant="outline" type="button" onClick={(e) => {
                const input = (e.currentTarget as HTMLElement).parentElement?.querySelector('input[type=file]') as HTMLInputElement
                input?.click()
              }}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Logo
              </Button>
            </label>
            {logoFile && <p className="text-xs text-emerald-600 mt-2">New logo selected: {logoFile.name}</p>}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Settings
            </>
          )}
        </Button>
      </div>

      <SuccessModal
        open={successOpen}
        message="Hospital settings saved successfully!"
        onClose={() => setSuccessOpen(false)}
      />
    </div>
  )
}

// Team Management Tab
const TeamManagement = () => {
  const { user } = useAppSelector((state) => state.auth)
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const [staff, setStaff] = useState<any[]>([])
  const [, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any | null>(null)
  const [resetPasswordStaff, setResetPasswordStaff] = useState<any | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [updatingStaff, setUpdatingStaff] = useState(false)
  const [teamSuccess, setTeamSuccess] = useState({ open: false, message: '' })
  const [newStaff, setNewStaff] = useState({
    name: '',
    role: 'RECEPTION',
    email: '',
    phone: '',
    username: '',
    password: '',
    status: 'ACTIVE',
  })

  const fetchTeam = async () => {
    try {
      const res = await settingsAPI.getTeam()
      const data = res.data.data
      setStaff(data?.users || data || [])
    } catch (err) {
      console.error('Failed to fetch team:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTeam() }, [])

  const handleAddStaff = async () => {
    try {
      await settingsAPI.addTeamMember(newStaff)
      setNewStaff({ name: '', role: 'RECEPTION', email: '', phone: '', username: '', password: '', status: 'ACTIVE' })
      setShowAddModal(false)
      setTeamSuccess({ open: true, message: 'Staff member added successfully!' })
      await fetchTeam()
    } catch (err) {
      console.error('Failed to add staff:', err)
      alert('Failed to add staff member')
    }
  }

  const handleUpdateStaff = async () => {
    if (!editingStaff) return
    setUpdatingStaff(true)
    try {
      await settingsAPI.updateTeamMember(editingStaff.id, editingStaff)
      setEditingStaff(null)
      setTeamSuccess({ open: true, message: 'Staff member updated successfully!' })
      await fetchTeam()
    } catch (err) {
      console.error('Failed to update staff:', err)
      alert('Failed to update staff member')
    } finally {
      setUpdatingStaff(false)
    }
  }

  const handleChangePassword = async () => {
    if (!resetPasswordStaff || !resetPassword) return
    if (resetPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }
    setPasswordSaving(true)
    try {
      await settingsAPI.changePassword(resetPasswordStaff.id, resetPassword)
      setResetPassword('')
      setResetPasswordStaff(null)
      setTeamSuccess({ open: true, message: 'Password updated successfully!' })
    } catch (err) {
      console.error('Failed to change password:', err)
      alert('Failed to change password')
    } finally {
      setPasswordSaving(false)
    }
  }

  const toggleStatus = async (id: string) => {
    const member = staff.find(s => s.id === id)
    if (!member) return
    try {
      await settingsAPI.updateTeamMember(String(id), { status: member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })
      setTeamSuccess({ open: true, message: 'Status updated successfully!' })
      await fetchTeam()
    } catch (err) {
      console.error('Failed to toggle status:', err)
    }
  }

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'DOCTOR': return 'bg-blue-100 text-blue-700'
      case 'RECEPTION': return 'bg-purple-100 text-purple-700'
      case 'SUPER_ADMIN': return 'bg-emerald-100 text-emerald-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Team Members</h3>
          <p className="text-sm text-slate-500">Manage staff accounts and permissions</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Staff
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-slate-800">{staff.length}</p>
          <p className="text-sm text-slate-500">Total Staff</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-blue-600">{staff.filter(s => s.role === 'DOCTOR').length}</p>
          <p className="text-sm text-slate-500">Doctors</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-emerald-600">{staff.filter(s => s.status === 'ACTIVE').length}</p>
          <p className="text-sm text-slate-500">Active</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-slate-400">{staff.filter(s => s.status === 'INACTIVE').length}</p>
          <p className="text-sm text-slate-500">Inactive</p>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Name</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Role</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Email</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Phone</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Joined</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${member.role === 'DOCTOR' ? 'bg-blue-500' :
                          member.role === 'RECEPTION' ? 'bg-purple-500' : 'bg-emerald-500'
                        }`}>
                        {member.name?.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-800">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${getRoleBadgeClass(member.role)}`}>
                      {ROLE_LABELS[member.role] || member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{member.email}</td>
                  <td className="px-6 py-4 text-slate-600">{member.phone}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleStatus(member.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium ${member.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                    >
                      {member.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{member.createdAt ? new Date(member.createdAt).toLocaleDateString() : '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {isSuperAdmin && (
                        <button
                          onClick={() => setEditingStaff(member)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => { setResetPasswordStaff(member); setResetPassword('') }}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Reset Password"
                      >
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Add Staff Member</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <Input
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
                <Select
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                  options={[
                    { value: 'RECEPTION', label: 'Reception' },
                    { value: 'DOCTOR', label: 'Doctor' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <Input
                  type="email"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                <Input
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username *</label>
                <Input
                  value={newStaff.username}
                  onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })}
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                <Input
                  type="password"
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                  placeholder="Enter password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <Select
                  value={newStaff.status}
                  onChange={(e) => setNewStaff({ ...newStaff, status: e.target.value })}
                  options={[
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'INACTIVE', label: 'Inactive' },
                  ]}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleAddStaff}>Add Staff</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Edit Staff Member</h3>
              <button onClick={() => setEditingStaff(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <Input
                  value={editingStaff.name}
                  onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
                <Select
                  value={editingStaff.role}
                  onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })}
                  options={[
                    { value: 'RECEPTION', label: 'Reception' },
                    { value: 'DOCTOR', label: 'Doctor' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <Input
                  type="email"
                  value={editingStaff.email}
                  onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                <Input
                  value={editingStaff.phone}
                  onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <Select
                  value={editingStaff.status}
                  onChange={(e) => setEditingStaff({ ...editingStaff, status: e.target.value })}
                  options={[
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'INACTIVE', label: 'Inactive' },
                  ]}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setEditingStaff(null)}>Cancel</Button>
              <Button className="flex-1" onClick={handleUpdateStaff} disabled={updatingStaff}>
                {updatingStaff ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Reset Password</h3>
              <button onClick={() => { setResetPasswordStaff(null); setResetPassword('') }} className="p-1 hover:bg-slate-100 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 mb-4">
              <p className="text-sm text-slate-500">Resetting password for</p>
              <p className="font-semibold text-slate-800">{resetPasswordStaff.name}</p>
              <p className="text-xs text-slate-500">{resetPasswordStaff.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password *</label>
              <Input
                type="text"
                placeholder="Enter new password (min 6 chars)"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
              />
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => { setResetPasswordStaff(null); setResetPassword('') }}>Cancel</Button>
              <Button
                className="flex-1"
                onClick={handleChangePassword}
                disabled={!resetPassword || resetPassword.length < 6 || passwordSaving}
              >
                {passwordSaving ? 'Saving...' : 'Change Password'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <SuccessModal
        open={teamSuccess.open}
        message={teamSuccess.message}
        onClose={() => setTeamSuccess({ open: false, message: '' })}
      />
    </div>
  )
}

// Master Data Tab
const MasterData = () => {
  const { user } = useAppSelector((state) => state.auth)
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const [activeSection, setActiveSection] = useState('roomTypes')

  // Room Types
  const [roomTypes, setRoomTypes] = useState<any[]>([])

  // Service Categories
  const [serviceCategories, setServiceCategories] = useState<any[]>([])

  // Payment Modes (static — backend enum, no CRUD API)
  const [paymentModes, setPaymentModes] = useState([
    { id: 'CASH', name: 'Cash', status: 'active' },
    { id: 'CARD', name: 'Card', status: 'active' },
    { id: 'UPI', name: 'UPI', status: 'active' },
    { id: 'BANK_TRANSFER', name: 'Bank Transfer', status: 'active' },
    { id: 'CHEQUE', name: 'Cheque', status: 'active' },
    { id: 'ONLINE', name: 'Online', status: 'active' },
  ])

  // Specializations (static — derived list, no dedicated API)
  const specializations = [
    'Psychiatry', 'Clinical Psychology', 'Neurology', 'General Medicine',
    'Addiction Medicine', 'Child Psychiatry', 'Geriatric Psychiatry',
  ]

  // Expense Categories
  const [expenseCategories, setExpenseCategories] = useState<any[]>([])

  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', rate: '', facilities: '', description: '', type: '' })
  const [successModal, setSuccessModal] = useState({ open: false, message: '' })
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => Promise<void> }>({ open: false, title: '', message: '', onConfirm: async () => { } })
  const [editingRoomType, setEditingRoomType] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({ rentPerDay: '', facilities: '', description: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editingServiceCat, setEditingServiceCat] = useState<any | null>(null)
  const [editServiceCatName, setEditServiceCatName] = useState('')
  const [savingServiceCatEdit, setSavingServiceCatEdit] = useState(false)

  const showSuccess = (msg: string) => {
    setSuccessModal({ open: true, message: msg })
  }

  useEffect(() => { fetchMasterData() }, [])

  const fetchMasterData = async () => {
    try {
      const [roomRes, expCatRes, svcCatRes] = await Promise.all([
        roomTypeAPI.getAll(),
        expenseAPI.getCategories(),
        serviceAPI.getCategories(),
      ])
      setRoomTypes(roomRes.data.data || [])
      setExpenseCategories(expCatRes.data.data || [])
      setServiceCategories(svcCatRes.data.data || [])
    } catch (err) {
      console.error('Failed to fetch master data:', err)
    }
  }

  const handleAddItem = async () => {
    setSaving(true)
    try {
      switch (activeSection) {
        case 'roomTypes': {
          await roomTypeAPI.create({
            type: newItem.type,
            rentPerDay: Number(newItem.rate) || 0,
            facilities: newItem.facilities || '',
            description: newItem.description || undefined,
          })
          showSuccess('Room type added successfully!')
          break
        }
        case 'serviceCategories': {
          await serviceAPI.createCategory({ name: newItem.name })
          showSuccess('Service category added successfully!')
          break
        }
        case 'expenseCategories': {
          await expenseAPI.createCategory({ name: newItem.name })
          showSuccess('Expense category added successfully!')
          break
        }
        case 'paymentModes':
          setPaymentModes([...paymentModes, { id: newItem.name.toUpperCase().replace(/\s+/g, '_'), name: newItem.name, status: 'active' }])
          showSuccess('Payment mode added!')
          break
        default:
          break
      }
      await fetchMasterData()
    } catch (err: any) {
      console.error('Failed to add item:', err)
      alert(err?.response?.data?.message || 'Failed to add item')
    } finally {
      setSaving(false)
    }
    setNewItem({ name: '', rate: '', facilities: '', description: '', type: '' })
    setShowAddModal(false)
  }

  const sections = [
    { id: 'roomTypes', label: 'Room Types', icon: '🛏️' },
    { id: 'serviceCategories', label: 'Service Categories', icon: '⚕️' },
    { id: 'expenseCategories', label: 'Expense Categories', icon: '💰' },
    { id: 'paymentModes', label: 'Payment Modes', icon: '💳' },
    // { id: 'specializations', label: 'Specializations', icon: '🩺' },
  ]

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2">
        <div className="flex flex-wrap gap-2">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeSection === section.id
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <span>{section.icon}</span>
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Room Types */}
      {activeSection === 'roomTypes' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Room Types</h3>
              <p className="text-sm text-slate-500">Manage room types and their rates</p>
            </div>
            <Button onClick={() => setShowAddModal(true)}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Room Type
            </Button>
          </div>
          {roomTypes.length === 0 ? (
            <p className="text-center text-slate-400 py-12">No room types configured yet.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Room Type</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Rate/Day</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Facilities</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Description</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roomTypes.map(rt => (
                  <tr key={rt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">{rt.type}</td>
                    <td className="px-6 py-4 text-slate-600">₹{Number(rt.rentPerDay).toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-600">{rt.facilities || '-'}</td>
                    <td className="px-6 py-4 text-slate-500">{rt.description || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isSuperAdmin && (
                          <button
                            onClick={() => {
                              setEditingRoomType(rt)
                              setEditForm({ rentPerDay: String(Number(rt.rentPerDay)), facilities: rt.facilities || '', description: rt.description || '' })
                            }}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Edit"
                          >
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button
                            onClick={() => {
                              setConfirmModal({
                                open: true,
                                title: 'Delete Room Type',
                                message: `Are you sure you want to delete "${rt.type}"? This won't work if rooms are using this type.`,
                                onConfirm: async () => {
                                  try {
                                    await roomTypeAPI.delete(rt.id)
                                    setConfirmModal(prev => ({ ...prev, open: false }))
                                    showSuccess('Room type deleted successfully!')
                                    await fetchMasterData()
                                  } catch (err: any) { alert(err?.response?.data?.message || 'Failed to delete') }
                                },
                              })
                            }}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Delete"
                          >
                            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Service Categories */}
      {activeSection === 'serviceCategories' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Service Categories</h3>
              <p className="text-sm text-slate-500">Manage service categories for medical services</p>
            </div>
            <Button onClick={() => setShowAddModal(true)}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Category
            </Button>
          </div>
          {serviceCategories.length === 0 ? (
            <p className="text-center text-slate-400 py-12">No service categories yet. Add one to get started.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {serviceCategories.map((cat: any) => (
                <div key={cat.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors">
                  <div>
                    <p className="font-medium text-slate-800">{cat.name}</p>
                    <p className="text-sm text-slate-500">{cat._count?.services ?? 0} services</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSuperAdmin && (
                      <button onClick={() => { setEditingServiceCat(cat); setEditServiceCatName(cat.name) }} className="p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                    )}
                    {isSuperAdmin && (
                      <button onClick={() => setConfirmModal({
                        open: true,
                        title: 'Delete Service Category',
                        message: `Are you sure you want to delete "${cat.name}"?${(cat._count?.services ?? 0) > 0 ? ' This category has services linked to it and cannot be deleted.' : ''}`,
                        onConfirm: async () => {
                          await serviceAPI.deleteCategory(cat.id)
                          setConfirmModal(prev => ({ ...prev, open: false }))
                          showSuccess('Service category deleted successfully!')
                          fetchMasterData()
                        }
                      })} className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Service Category Modal */}
      {editingServiceCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Edit Service Category</h3>
            <Input
              label="Category Name"
              value={editServiceCatName}
              onChange={(e) => setEditServiceCatName(e.target.value)}
            />
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setEditingServiceCat(null)}>Cancel</Button>
              <Button
                disabled={savingServiceCatEdit || !editServiceCatName.trim()}
                onClick={async () => {
                  setSavingServiceCatEdit(true)
                  try {
                    await serviceAPI.updateCategory(editingServiceCat.id, { name: editServiceCatName.trim() })
                    setEditingServiceCat(null)
                    showSuccess('Service category updated successfully!')
                    fetchMasterData()
                  } catch (err: any) {
                    alert(err?.response?.data?.message || 'Failed to update category')
                  } finally {
                    setSavingServiceCatEdit(false)
                  }
                }}
              >
                {savingServiceCatEdit ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modes */}
      {activeSection === 'paymentModes' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Payment Modes</h3>
              <p className="text-sm text-slate-500">Manage accepted payment methods</p>
            </div>
            <Button onClick={() => setShowAddModal(true)}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Payment Mode
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {paymentModes.map(mode => (
              <div key={mode.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mode.status === 'active' ? 'bg-emerald-100' : 'bg-slate-100'
                    }`}>
                    <svg className={`w-5 h-5 ${mode.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{mode.name}</p>
                    <p className={`text-xs ${mode.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {mode.status === 'active' ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPaymentModes(paymentModes.map(m =>
                    m.id === mode.id ? { ...m, status: m.status === 'active' ? 'inactive' : 'active' } : m
                  ))}
                  className={`w-12 h-6 rounded-full transition-colors relative ${mode.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${mode.status === 'active' ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Specializations */}
      {activeSection === 'specializations' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Doctor Specializations</h3>
              <p className="text-sm text-slate-500">Reference list of available specializations</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {specializations.map((spec, idx) => (
              <div key={idx} className="flex items-center gap-3 p-4 rounded-xl border border-slate-200">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <p className="font-medium text-slate-800">{spec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense Categories */}
      {activeSection === 'expenseCategories' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Expense Categories</h3>
              <p className="text-sm text-slate-500">Manage expense categories for tracking hospital expenses</p>
            </div>
            <Button onClick={() => setShowAddModal(true)}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Category
            </Button>
          </div>
          {expenseCategories.length === 0 ? (
            <p className="text-center text-slate-400 py-12">No expense categories yet. Add one to get started.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {expenseCategories.map((cat: any) => (
                <div key={cat.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{cat.name}</p>
                      <p className="text-xs text-slate-500">{cat._count?.expenses ?? 0} expenses</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${cat.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {cat.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">
                Add {activeSection === 'roomTypes' ? 'Room Type' :
                  activeSection === 'serviceCategories' ? 'Service Category' :
                    activeSection === 'paymentModes' ? 'Payment Mode' :
                      activeSection === 'expenseCategories' ? 'Expense Category' : 'Item'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              {activeSection === 'roomTypes' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Room Type *</label>
                    <Input
                      type="text"
                      value={newItem.type}
                      onChange={(e) =>
                        setNewItem({ ...newItem, type: e.target.value })
                      }
                      placeholder="Enter room type (e.g. AC, ICU, Private)"
                      className="form-control"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Rate per Day (₹) *</label>
                    <Input
                      type="number"
                      value={newItem.rate}
                      onChange={(e) => setNewItem({ ...newItem, rate: e.target.value })}
                      placeholder="Enter rate"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Facilities</label>
                    <Input
                      value={newItem.facilities}
                      onChange={(e) => setNewItem({ ...newItem, facilities: e.target.value })}
                      placeholder="e.g., AC, TV, WiFi, Attached Bathroom"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <Input
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      placeholder="Brief description"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                  <Input
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="Enter name"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleAddItem} disabled={saving}>
                {saving ? <span className="flex items-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>Adding...</span> : 'Add'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Room Type Modal */}
      {editingRoomType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Edit {editingRoomType.type}</h3>
              <button onClick={() => setEditingRoomType(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              setSavingEdit(true)
              try {
                await roomTypeAPI.update(editingRoomType.id, {
                  rentPerDay: Number(editForm.rentPerDay),
                  facilities: editForm.facilities,
                  description: editForm.description || undefined,
                })
                setEditingRoomType(null)
                showSuccess('Room type updated successfully!')
                await fetchMasterData()
              } catch (err: any) { alert(err?.response?.data?.message || 'Failed to update') }
              finally { setSavingEdit(false) }
            }} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Room Type</label>
                <p className="text-sm text-slate-600 bg-slate-50 p-2.5 rounded-lg">{editingRoomType.type}</p>
              </div>
              <Input label="Rent Per Day (₹)" type="number" value={editForm.rentPerDay} onChange={(e) => setEditForm(prev => ({ ...prev, rentPerDay: e.target.value }))} min={0} required />
              <Input label="Facilities" value={editForm.facilities} onChange={(e) => setEditForm(prev => ({ ...prev, facilities: e.target.value }))} placeholder="e.g., AC, TV, WiFi" />
              <Input label="Description" value={editForm.description} onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Brief description" />
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingRoomType(null)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={savingEdit}>
                  {savingEdit ? <span className="flex items-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>Saving...</span> : 'Update'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))}
      />

      {/* Success Modal */}
      <SuccessModal
        open={successModal.open}
        message={successModal.message}
        onClose={() => setSuccessModal({ open: false, message: '' })}
      />
    </div>
  )
}

// Main Settings Dashboard
const SettingsDashboard = () => {
  const [activeTab, setActiveTab] = useState('hospital')

  const tabs = [
    {
      id: 'hospital', label: 'Hospital Settings', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      id: 'team', label: 'Team Management', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      id: 'master', label: 'Master Data', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      )
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-500">Manage hospital settings, team, and master data</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2">
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === tab.id
                  ? 'bg-linear-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'hospital' && <HospitalSettings />}
      {activeTab === 'team' && <TeamManagement />}
      {activeTab === 'master' && <MasterData />}
    </div>
  )
}

export default SettingsDashboard
