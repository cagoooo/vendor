import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

// Lazy-loaded page components (code splitting)
const ClassSelectorPage = lazy(() => import('./apps/customer/ClassSelectorPage').then(m => ({ default: m.ClassSelectorPage })));
const CustomerApp = lazy(() => import('./apps/customer/CustomerApp').then(m => ({ default: m.CustomerApp })));
const KitchenApp = lazy(() => import('./apps/kitchen/KitchenApp').then(m => ({ default: m.KitchenApp })));
const LoginPage = lazy(() => import('./apps/kitchen/LoginPage').then(m => ({ default: m.LoginPage })));
const AdminApp = lazy(() => import('./apps/admin/AdminApp').then(m => ({ default: m.AdminApp })));
const DisplayApp = lazy(() => import('./apps/display/DisplayApp').then(m => ({ default: m.DisplayApp })));

// Loading spinner for Suspense fallback
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
    </div>
  );
}

// 受保護路由元件 (一般員工/班級管理員)
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated, isPending, profile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  // 待審核狀態 -> 顯示登入頁（會顯示待審核畫面）
  if (isPending) {
    return <LoginPage />;
  }

  // 未登入或無權限 -> 顯示登入頁
  if (!isAuthenticated || !profile || profile.role === 'none') {
    return <LoginPage />;
  }

  return <>{children}</>;
}

// 管理員專用路由
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { loading, isOwner } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
      </div>
    );
  }

  // 只有 owner 可以存取管理頁面
  if (!isOwner) {
    return <Navigate to="/kitchen" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* 首頁 - 班級選擇 */}
      <Route path="/" element={<ClassSelectorPage />} />

      {/* 顧客點餐 - 公開，需指定班級 */}
      <Route path="/order/:classId" element={<CustomerApp />} />

      {/* 叫號顯示 - 公開，需指定班級 */}
      <Route path="/display/:classId" element={<DisplayApp />} />
      <Route path="/pickup/:classId" element={<DisplayApp />} />

      {/* 廚房管理 - 需登入 */}
      <Route path="/kitchen" element={
        <ProtectedRoute>
          <KitchenApp />
        </ProtectedRoute>
      } />

      {/* 管理中心 - 只有 owner */}
      <Route path="/admin" element={
        <AdminRoute>
          <AdminApp />
        </AdminRoute>
      } />

      <Route path="/login" element={<LoginPage />} />

      {/* 舊路由相容 - 導向首頁 */}
      <Route path="/order" element={<Navigate to="/" replace />} />
      <Route path="/display" element={<Navigate to="/" replace />} />
      <Route path="/pickup" element={<Navigate to="/" replace />} />

      {/* 預設導向 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// 取得 base path（GitHub Pages 部署時使用 /vendor/）
const basename = import.meta.env.BASE_URL;

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <AuthProvider>
          <Suspense fallback={<LoadingSpinner />}>
            <AppRoutes />
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

