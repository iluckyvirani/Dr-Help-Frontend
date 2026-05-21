import axiosInstance from './axiosInstance';

// ============================================
// Phase 1: Auth APIs
// ============================================
export const authAPI = {
  login: (data: { username: string; password: string }) =>
    axiosInstance.post('/auth/login', data),

  getProfile: () =>
    axiosInstance.get('/auth/me'),

  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    axiosInstance.post('/auth/change-password', data),

  refreshToken: () =>
    axiosInstance.post('/auth/refresh-token'),

  logout: () =>
    axiosInstance.post('/auth/logout'),
};

// ============================================
// Phase 2: Doctor APIs
// ============================================
export const doctorAPI = {
  create: (data: FormData) =>
    axiosInstance.post('/doctors', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getAll: (params?: Record<string, any>) =>
    axiosInstance.get('/doctors', { params }),

  getById: (id: string) =>
    axiosInstance.get(`/doctors/${id}`),

  update: (id: string, data: FormData) =>
    axiosInstance.put(`/doctors/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  toggleStatus: (id: string) =>
    axiosInstance.patch(`/doctors/${id}/status`),

  delete: (id: string) =>
    axiosInstance.delete(`/doctors/${id}`),

  getSchedule: (id: string, params?: Record<string, any>) =>
    axiosInstance.get(`/doctors/${id}/schedule`, { params }),
};

// ============================================
// Phase 5: Patient APIs
// ============================================
export const patientAPI = {
  create: (data: Record<string, any>) =>
    axiosInstance.post('/patients', data),

  getAll: (params?: Record<string, any>) =>
    axiosInstance.get('/patients', { params }),

  getById: (id: string) =>
    axiosInstance.get(`/patients/${id}`),

  update: (id: string, data: Record<string, any>) =>
    axiosInstance.put(`/patients/${id}`, data),

  getOpdHistory: (id: string) =>
    axiosInstance.get(`/patients/${id}/medicine-history`),

  getServiceHistory: (id: string) =>
    axiosInstance.get(`/patients/${id}/service-history`),

  getPaymentHistory: (id: string) =>
    axiosInstance.get(`/patients/${id}/payment-history`),

  uploadReport: (id: string, data: FormData) =>
    axiosInstance.post(`/patients/${id}/reports`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getReports: (id: string) =>
    axiosInstance.get(`/patients/${id}/reports`),

  deleteReport: (id: string, reportId: string) =>
    axiosInstance.delete(`/patients/${id}/reports/${reportId}`),

  delete: (id: string) =>
    axiosInstance.delete(`/patients/${id}`),
};

// ============================================
// Phase 6: OPD APIs
// ============================================
export const opdAPI = {
  getNextToken: () =>
    axiosInstance.get('/opd/token/next'),

  getTodayVisits: (params?: Record<string, any>) =>
    axiosInstance.get('/opd/today', { params }),

  createVisit: (data: Record<string, any>) =>
    axiosInstance.post('/opd', data),

  getAllVisits: (params?: Record<string, any>) =>
    axiosInstance.get('/opd', { params }),

  getVisitById: (id: string) =>
    axiosInstance.get(`/opd/${id}`),

  updateVisit: (id: string, data: Record<string, any>) =>
    axiosInstance.patch(`/opd/${id}`, data),

  updatePayment: (id: string, data: { paymentStatus: string; paymentMode: string }) =>
    axiosInstance.put(`/opd/${id}/payment`, data),

  getSlip: (id: string) =>
    axiosInstance.get(`/opd/${id}/slip`),

  update: (id: string, data: Record<string, any>) => axiosInstance.put(`/opd/${id}`, data),


  updateCheck: (id: string, check: boolean) =>
    axiosInstance.patch(`/opd/${id}/check`, { check }),


  delete: (id: string) => axiosInstance.delete(`/opd/${id}`),

};

// ============================================
// Phase 7–14: APIs Not Available Yet
// Placeholders for future integration
// ============================================

// Dashboard APIs (Phase 7)
export const dashboardAPI = {
  getStats: (period?: string) => axiosInstance.get('/dashboard/stats', { params: { period } }),
  getRecentActivities: () => axiosInstance.get('/dashboard/recent-activities'),
  getUpcomingAppointments: () => axiosInstance.get('/dashboard/upcoming-appointments'),
};

// Service APIs (Phase 9)
export const serviceAPI = {
  getAll: (params?: Record<string, any>) => axiosInstance.get('/services', { params }),
  create: (data: Record<string, any>) => axiosInstance.post('/services', data),
  update: (id: string, data: Record<string, any>) => axiosInstance.put(`/services/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/services/${id}`),
  assign: (data: Record<string, any>) => axiosInstance.post('/services/assign', data),
  updateAssigned: (id: string, data: Record<string, any>) => axiosInstance.put(`/services/assign/${id}`, data),
  deleteAssigned: (id: string) => axiosInstance.delete(`/services/assign/${id}`),
  getCategories: () => axiosInstance.get('/services/categories'),
  createCategory: (data: { name: string }) => axiosInstance.post('/services/categories', data),
  updateCategory: (id: string, data: { name?: string; description?: string }) => axiosInstance.put(`/services/categories/${id}`, data),
  deleteCategory: (id: string) => axiosInstance.delete(`/services/categories/${id}`),
};

// Billing APIs (Phase 11)
export const billingAPI = {
  getDashboard: () => axiosInstance.get('/billing/dashboard'),
  getBills: (params?: Record<string, any>) => axiosInstance.get('/billing', { params }),
  getDeposits: (params?: Record<string, any>) => axiosInstance.get('/billing/deposits', { params }),
  createDeposit: (data: Record<string, any>) => axiosInstance.post('/billing/deposits', data),
  exportDepositsPdf: (params?: Record<string, any>) =>
    axiosInstance.get('/billing/deposits/pdf', { params, responseType: 'blob' }),
  exportRefundsPdf: (params?: Record<string, any>) =>
    axiosInstance.get('/billing/refunds/pdf', { params, responseType: 'blob' }),
  generateBill: (data: Record<string, any>) => axiosInstance.post('/billing/generate', data),
  updatePayment: (id: string, data: Record<string, any>) => axiosInstance.patch(`/billing/${id}/payment`, data),
  update: (id: string, data: Record<string, any>) => axiosInstance.put(`/billing/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/billing/${id}`),
};

// Expense APIs (Phase 12)
export const expenseAPI = {
  getAll: (params?: Record<string, any>) => axiosInstance.get('/expenses', { params }),
  getStats: () => axiosInstance.get('/expenses/stats'),
  create: (data: FormData) => axiosInstance.post('/expenses', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id: string, data: FormData) => axiosInstance.put(`/expenses/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id: string) => axiosInstance.delete(`/expenses/${id}`),
  getCategories: () => axiosInstance.get('/expenses/categories'),
  createCategory: (data: { name: string }) => axiosInstance.post('/expenses/categories', data),
};

// Report APIs (Phase 13)
export const reportAPI = {
  get: (type: string, params?: Record<string, any>) => axiosInstance.get(`/reports/${type}`, { params }),
  exportOpdPdf: (params?: Record<string, any>) =>
    axiosInstance.get('/reports/opd/pdf', { params, responseType: 'blob' }),
};

// Settings APIs (Phase 14)
export const settingsAPI = {
  getHospital: () => axiosInstance.get('/settings/hospital'),
  updateHospital: (data: FormData) => axiosInstance.put('/settings/hospital', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getTeam: (params?: Record<string, any>) => axiosInstance.get('/settings/team', { params }),
  addTeamMember: (data: Record<string, any>) => axiosInstance.post('/settings/team', data),
  updateTeamMember: (id: string, data: Record<string, any>) => axiosInstance.put(`/settings/team/${id}`, data),
  changePassword: (id: string, password: string) => axiosInstance.put(`/settings/team/${id}/password`, { password }),
  deleteTeamMember: (id: string) => axiosInstance.delete(`/settings/team/${id}`),
};

// Prescription APIs (Phase 15)
export const prescriptionAPI = {
  create: (data: Record<string, any>) => axiosInstance.post('/prescriptions', data),
  getById: (id: string) => axiosInstance.get(`/prescriptions/${id}`),
  getByPatient: (patientId: string) => axiosInstance.get(`/prescriptions/patient/${patientId}`),
  update: (id: string, data: Record<string, any>) => axiosInstance.put(`/prescriptions/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/prescriptions/${id}`),
};
