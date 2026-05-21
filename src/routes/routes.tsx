import { lazy } from 'react'
import { Navigate } from 'react-router-dom'
import AuthGuard from '../components/AuthGuard'

// Layouts
const DashboardLayout = lazy(() => import('../Dashboard Layout/DashboardLayout'))

// Pages
const LoginPage = lazy(() => import('../pages/Login/LoginPage'))
const DashboardPage = lazy(() => import('../pages/Dashboard/DashboardPage'))

// OPD Pages
const OPDPatientList = lazy(() => import('../pages/OPD/OPDPatientList'))
const OPDRegistration = lazy(() => import('../pages/OPD/OPDRegistration'))
const OPDSlip = lazy(() => import('../pages/OPD/OPDSlip'))
const OPDHistoryPage = lazy(() => import('../pages/OPD/OPDHistoryPage'))

// Doctor Management
const DoctorManagement = lazy(() => import('../pages/Doctors/DoctorManagement'))

// Services
const ServiceList = lazy(() => import('../pages/Services/ServiceList'))
const AssignService = lazy(() => import('../pages/Services/AssignService'))

// Patient Management
const PatientList = lazy(() => import('../pages/Patients/PatientList'))
const PatientDetail = lazy(() => import('../pages/Patients/PatientDetail'))

// Prescriptions
const AddPrescription = lazy(() => import('../pages/Prescriptions/AddPrescription'))

// Billing
const BillingDashboard = lazy(() => import('../pages/Billing/BillingDashboard'))
const GenerateBill = lazy(() => import('../pages/Billing/GenerateBill'))

// Settings
const SettingsDashboard = lazy(() => import('../pages/Settings/SettingsDashboard'))

// Expenses
const ExpenseDashboard = lazy(() => import('../pages/Expenses/ExpenseDashboard'))

// Reports
const ReportsDashboard = lazy(() => import('../pages/Reports/ReportsDashboard'))

// Route configuration
const routes = [
  // Public Routes
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPage /> },
  
  // Protected Routes (wrapped with AuthGuard)
  {
    element: <AuthGuard />,
    children: [
  {
    path: '/dashboard',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
    ],
  },
  {
    path: '/opd',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <OPDPatientList /> },
      { path: 'register', element: <OPDRegistration /> },
      { path: 'slip/:id', element: <OPDSlip /> },
      { path: 'history', element: <OPDHistoryPage /> },
    ],
  },
  {
    path: '/patients',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <PatientList /> },
      { path: ':id', element: <PatientDetail /> },
    ],
  },
  {
    path: '/prescriptions',
    element: <DashboardLayout />,
    children: [
      { path: 'add', element: <AddPrescription /> },
    ],
  },
  {
    path: '/doctors',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <DoctorManagement /> },
    ],
  },
  {
    path: '/services',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <ServiceList /> },
      { path: 'assign', element: <AssignService /> },
    ],
  },
  {
    path: '/billing',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <BillingDashboard /> },
      { path: 'generate', element: <GenerateBill /> },
    ],
  },
  {
    path: '/expenses',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <ExpenseDashboard /> },
    ],
  },
  {
    path: '/reports',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <ReportsDashboard /> },
    ],
  },
  {
    path: '/settings',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <SettingsDashboard /> },
    ],
  },
  {
    path: '/support',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <div className="p-6 text-slate-600">Support Module - Coming Soon</div> },
    ],
  },
    ], // end AuthGuard children
  },
]

export default routes