import { createFileRoute, Navigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import apiClient from '@/api/client'
import type { LoginRequest, LoginResponse, APIResponse } from '@/types'
import { Eye, EyeOff, Store, Users, CreditCard, BarChart3, ChefHat, UserCheck, Settings } from 'lucide-react'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<LoginRequest>({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  // Check if already authenticated
  if (apiClient.isAuthenticated()) {
    return <Navigate to="/" />
  }

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const response: APIResponse<LoginResponse> = await apiClient.login(credentials)
      return response
    },
    onSuccess: (data) => {
      console.log('Login success:', data)
      console.log('Current API URL:', import.meta.env.VITE_API_URL)
      if (data.success && data.data) {
        apiClient.setAuthToken(data.data.token)
        localStorage.setItem('pos_user', JSON.stringify(data.data.user))
        console.log('Auth token set, redirecting to home...')
        setTimeout(() => {
          router.navigate({ to: '/' })
        }, 100)
      } else {
        console.error('Login failed:', data)
        setError(data.message || 'Login failed')
      }
    },
    onError: (error: any) => {
      setError(error.message || 'Login failed')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!formData.username || !formData.password) {
      setError('Username and password are required')
      return
    }

    loginMutation.mutate(formData)
  }

  const fillDemoCredentials = (username: string, password: string) => {
    setFormData({ username, password })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 p-12 text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-center max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Store className="w-7 h-7" />
            </div>
            <h1 className="text-3xl font-bold">Dominos Restaurant</h1>
          </div>
          
          <h2 className="text-4xl font-bold mb-6 leading-tight">
            Modern Point of Sale
            <br />
            <span className="text-blue-200">for Your Business</span>
          </h2>
          
          <p className="text-xl text-blue-100 mb-12 leading-relaxed">
            Streamline your operations with our complete POS solution. Manage orders, 
            track inventory, and grow your business with powerful analytics.
          </p>

          <div className="grid grid-cols-2 gap-6">
            {[
              { icon: Users, title: 'Staff Management', desc: 'Role-based access control' },
              { icon: CreditCard, title: 'Payment Processing', desc: 'Multiple payment methods' },
              { icon: BarChart3, title: 'Real-time Analytics', desc: 'Business insights' },
              { icon: Store, title: 'Order Management', desc: 'Kitchen workflow' },
            ].map((feature, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{feature.title}</h3>
                  <p className="text-blue-200 text-xs">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full"
               style={{
                 backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                 backgroundSize: '50px 50px'
               }} />
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-5 sm:pb-8">
              {/* Mobile-only brand bar (left panel is hidden on mobile) */}
              <div className="lg:hidden flex items-center justify-center gap-2 text-xs text-muted-foreground mb-3">
                <Store className="w-3.5 h-3.5" />
                Point of Sale System
              </div>
              <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                <Store className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold">Dominos Restaurant</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Sign in to continue
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Username</label>
                  <Input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className="h-11"
                    autoComplete="username"
                    disabled={loginMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="h-11 pr-10"
                      autoComplete="current-password"
                      disabled={loginMutation.isPending}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-gradient-to-r from-red-50 to-red-25 border border-red-200 text-red-700 p-4 rounded-lg text-sm shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                      <span className="font-medium">Login Failed</span>
                    </div>
                    <div className="mt-1 text-xs text-red-600">{error}</div>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-base font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Signing In...
                    </div>
                  ) : (
                    'Sign In to Dominos Restaurant'
                  )}
                </Button>
              </form>

              <div className="border-t pt-5">
                <p className="text-xs text-center text-gray-500 mb-3 font-medium">Quick-login demo accounts</p>

                {/* Featured Roles */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3">
                  {[
                    {
                      username: 'counter1',
                      role: 'Counter',
                      icon: CreditCard,
                      bg: 'bg-gradient-to-br from-green-100 to-green-50 text-green-800 border-green-200',
                      desc: 'Payment & orders',
                      password: 'admin123',
                    },
                    {
                      username: 'kitchen1',
                      role: 'Kitchen',
                      icon: ChefHat,
                      bg: 'bg-gradient-to-br from-orange-100 to-orange-50 text-orange-800 border-orange-200',
                      desc: 'Order prep',
                      password: 'admin123',
                    },
                  ].map((account) => (
                    <button
                      key={account.username}
                      onClick={() => fillDemoCredentials(account.username, account.password)}
                      className={`p-3 rounded-xl border-2 ${account.bg} active:scale-95 sm:hover:scale-105 text-left transition-all duration-200 shadow-sm`}
                      disabled={loginMutation.isPending}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-white/70 rounded-lg flex items-center justify-center flex-shrink-0">
                          <account.icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm leading-tight">{account.role}</div>
                          <div className="text-xs opacity-70 truncate">{account.desc}</div>
                          <div className="text-[10px] opacity-50 font-mono">{account.password}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Other Roles */}
                <div className="grid gap-1.5">
                  {[
                    { username: 'admin',    role: 'Admin',   icon: Settings,  bg: 'bg-red-50 text-red-700 border-red-100',    desc: 'Full system access',   password: 'admin123' },
                    { username: 'manager1', role: 'Manager', icon: BarChart3,  bg: 'bg-blue-50 text-blue-700 border-blue-100',  desc: 'Management & reports', password: 'admin123' },
                    { username: 'server1',  role: 'Server',  icon: UserCheck,  bg: 'bg-purple-50 text-purple-700 border-purple-100', desc: 'Table service',   password: 'admin123' },
                  ].map((account) => (
                    <button
                      key={account.username}
                      onClick={() => fillDemoCredentials(account.username, account.password)}
                      className={`flex items-center justify-between p-2.5 border rounded-lg ${account.bg} active:opacity-70 text-left transition-all duration-150`}
                      disabled={loginMutation.isPending}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 bg-white/70 rounded flex items-center justify-center flex-shrink-0">
                          <account.icon className="w-3 h-3" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{account.role}</div>
                          <div className="text-xs opacity-70">{account.desc}</div>
                        </div>
                      </div>
                      <div className="text-[10px] opacity-50 font-mono shrink-0 ml-2">{account.password}</div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
