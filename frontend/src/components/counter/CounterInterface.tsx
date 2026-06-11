import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Minus,
  ShoppingCart,
  CreditCard,
  DollarSign,
  Check,
  Clock,
  Search,
  Package,
  Car,
  ChefHat,
  RefreshCw,
  Bell,
  HandCoins,
  Smartphone,
} from 'lucide-react'
import type { Product, Order } from '@/types'

interface CartItem {
  product: Product
  quantity: number
}

export function CounterInterface() {
  const [activeTab, setActiveTab] = useState<'create' | 'queue'>('create')
  const [orderType, setOrderType] = useState<'takeout' | 'delivery'>('takeout')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [customerName, setCustomerName] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderNotes, setOrderNotes] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit_card' | 'debit_card' | 'digital_wallet'>('cash')
  const [readyNotification, setReadyNotification] = useState(0)
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null)

  const prevReadyCountRef = useRef(0)
  const queryClient = useQueryClient()

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient.getCategories().then(res => res.data),
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products', selectedCategory],
    queryFn: () =>
      selectedCategory === 'all'
        ? apiClient.getProducts().then(res => res.data)
        : apiClient.getProductsByCategory(selectedCategory).then(res => res.data),
  })

  // Poll all active orders every 5 seconds
  const { data: activeOrders = [], refetch: refetchActive } = useQuery({
    queryKey: ['activeOrders'],
    queryFn: () =>
      apiClient.getOrders({ limit: 100 }).then(res =>
        (res.data || []).filter((o: Order) => !['completed', 'cancelled'].includes(o.status))
      ),
    refetchInterval: 5000,
  })

  // Notify when new ready orders arrive
  useEffect(() => {
    const readyCount = activeOrders.filter((o: Order) => o.status === 'ready').length
    if (readyCount > prevReadyCountRef.current) {
      setReadyNotification(readyCount)
    }
    prevReadyCountRef.current = readyCount
  }, [activeOrders])

  const readyOrders = activeOrders.filter((o: Order) => o.status === 'ready')
  const cookingOrders = activeOrders.filter((o: Order) =>
    ['pending', 'confirmed', 'preparing'].includes(o.status)
  )

  // Create order then immediately process payment
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const total = getTotalAmount()
      const orderRes = await apiClient.createCounterOrder({
        customer_name: customerName || undefined,
        order_type: orderType,
        items: cart.map(item => ({ product_id: item.product.id, quantity: item.quantity })),
        notes: orderNotes || undefined,
      })
      if (!orderRes.success || !orderRes.data) throw new Error('Order creation failed')
      const orderId = orderRes.data.id
      await apiClient.processCounterPayment(orderId, { payment_method: paymentMethod, amount: total })
      return orderRes.data.order_number as string
    },
    onSuccess: (orderNumber) => {
      setOrderSuccess(`Order #${orderNumber} created and payment processed`)
      setCart([])
      setCustomerName('')
      setOrderNotes('')
      queryClient.invalidateQueries({ queryKey: ['activeOrders'] })
      setTimeout(() => setOrderSuccess(null), 4000)
    },
  })

  // Handover: mark order as completed
  const handoverMutation = useMutation({
    mutationFn: (orderId: string) => apiClient.updateOrderStatus(orderId, 'completed'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeOrders'] })
    },
  })

  const filteredProducts = products.filter(
    p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  )

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      return existing
        ? prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === productId)
      if (existing && existing.quantity > 1)
        return prev.map(i => i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i)
      return prev.filter(i => i.product.id !== productId)
    })
  }

  const getTotalAmount = () =>
    cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    preparing: 'bg-orange-100 text-orange-800',
    ready: 'bg-green-100 text-green-800',
  }

  const statusLabel: Record<string, string> = {
    pending: 'Waiting',
    confirmed: 'Accepted',
    preparing: 'Cooking',
    ready: 'Ready',
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Panel */}
      <div className="w-2/3 border-r border-border overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Counter / Checkout</h1>
              <p className="text-muted-foreground text-sm">Create orders and track kitchen</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'create' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('create')}
              >
                <Plus className="w-4 h-4 mr-1" />
                New Order
              </Button>
              <Button
                variant={activeTab === 'queue' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setActiveTab('queue'); setReadyNotification(0) }}
                className="relative"
              >
                <ChefHat className="w-4 h-4 mr-1" />
                Kitchen Queue
                {readyNotification > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold animate-bounce">
                    {readyNotification}
                  </span>
                )}
                {readyNotification === 0 && cookingOrders.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-orange-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {cookingOrders.length}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {activeTab === 'create' && (
            <>
              <div className="flex gap-2 mb-4">
                <Button variant={orderType === 'takeout' ? 'default' : 'outline'} size="sm" onClick={() => setOrderType('takeout')}>
                  <Package className="w-4 h-4 mr-1" />Takeout
                </Button>
                <Button variant={orderType === 'delivery' ? 'default' : 'outline'} size="sm" onClick={() => setOrderType('delivery')}>
                  <Car className="w-4 h-4 mr-1" />Delivery
                </Button>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <Button variant={selectedCategory === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory('all')}>
                  All Items
                </Button>
                {categories.map(cat => (
                  <Button key={cat.id} variant={selectedCategory === cat.id ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory(cat.id)}>
                    {cat.name}
                  </Button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'create' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(product => {
                const cartItem = cart.find(i => i.product.id === product.id)
                return (
                  <Card key={product.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base leading-tight">{product.name}</CardTitle>
                          {product.description && (
                            <CardDescription className="text-sm mt-1">
                              {product.description.substring(0, 55)}{product.description.length > 55 ? '...' : ''}
                            </CardDescription>
                          )}
                        </div>
                        <div className="text-base font-bold text-primary ml-2 shrink-0">{formatCurrency(product.price)}</div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {product.preparation_time > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />{product.preparation_time}m
                            </Badge>
                          )}
                          {!product.is_available && <Badge variant="secondary" className="text-xs">Unavailable</Badge>}
                        </div>
                        {product.is_available && (
                          cartItem ? (
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="sm" onClick={() => removeFromCart(product.id)}><Minus className="h-4 w-4" /></Button>
                              <span className="w-7 text-center font-medium">{cartItem.quantity}</span>
                              <Button variant="outline" size="sm" onClick={() => addToCart(product)}><Plus className="h-4 w-4" /></Button>
                            </div>
                          ) : (
                            <Button variant="default" size="sm" onClick={() => addToCart(product)}>
                              <Plus className="h-4 w-4 mr-1" />Add
                            </Button>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {activeTab === 'queue' && (
            <div className="space-y-6">
              {/* Ready for handover */}
              {readyOrders.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-green-700 mb-3 flex items-center gap-2">
                    <Bell className="w-5 h-5 animate-pulse" />
                    Ready for Handover ({readyOrders.length})
                  </h3>
                  <div className="space-y-3">
                    {readyOrders.map((order: Order) => (
                      <Card key={order.id} className="border-2 border-green-500 bg-green-50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-bold text-green-900 text-lg">Order #{order.order_number}</div>
                              <div className="text-sm text-green-700">
                                {order.customer_name || 'Guest'} · {order.items?.length || 0} items · {formatCurrency(order.total_amount)}
                              </div>
                              {order.items && order.items.length > 0 && (
                                <div className="mt-2 text-sm text-green-800">
                                  {order.items.map(i => `${i.quantity}× ${i.product?.name}`).join(', ')}
                                </div>
                              )}
                            </div>
                            <Button
                              className="bg-green-600 hover:bg-green-700 text-white h-12 px-6 text-base"
                              onClick={() => handoverMutation.mutate(order.id)}
                              disabled={handoverMutation.isPending}
                            >
                              <HandCoins className="w-5 h-5 mr-2" />
                              Handover
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Cooking queue */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ChefHat className="w-5 h-5" />
                    Cooking Queue ({cookingOrders.length})
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => refetchActive()}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
                {cookingOrders.length === 0 && readyOrders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p>No active orders right now</p>
                  </div>
                ) : cookingOrders.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4">No orders currently cooking</p>
                ) : (
                  <div className="space-y-3">
                    {cookingOrders.map((order: Order) => {
                      const waitMin = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)
                      return (
                        <Card key={order.id} className="border-l-4 border-l-orange-400">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold">Order #{order.order_number}</div>
                                <div className="text-sm text-muted-foreground">
                                  {order.customer_name || 'Guest'} · {order.items?.length || 0} items
                                </div>
                                {order.items && order.items.length > 0 && (
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {order.items.map(i => `${i.quantity}× ${i.product?.name}`).join(', ')}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-right">
                                <div className="text-sm text-muted-foreground">
                                  <Clock className="w-3 h-3 inline mr-1" />{waitMin}m
                                </div>
                                <Badge className={statusColor[order.status] || ''}>{statusLabel[order.status] || order.status}</Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel — Order Summary + Payment */}
      <div className="w-1/3 flex flex-col bg-card">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold mb-2">Customer</h3>
          <Input
            placeholder="Customer name (optional)"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
          />
        </div>

        {/* Cart */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="font-semibold mb-3 flex items-center">
            <ShoppingCart className="w-4 h-4 mr-2" />Order Items ({cart.length})
          </h3>
          {cart.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No items added</p>
              <p className="text-sm">Select products from the menu</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.product.name}</div>
                    <div className="text-sm text-muted-foreground">{formatCurrency(item.product.price)} × {item.quantity}</div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <div className="font-medium text-sm">{formatCurrency(item.product.price * item.quantity)}</div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => removeFromCart(item.product.id)}><Minus className="h-3 w-3" /></Button>
                      <span className="w-5 text-center text-sm">{item.quantity}</span>
                      <Button variant="ghost" size="sm" onClick={() => addToCart(item.product)}><Plus className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="mt-3">
                <label className="text-sm font-medium">Notes</label>
                <Input placeholder="Special requests..." value={orderNotes} onChange={e => setOrderNotes(e.target.value)} className="mt-1" />
              </div>
            </div>
          )}
        </div>

        {/* Payment method + checkout */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-border space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentMethod('cash')}
                >
                  <DollarSign className="w-4 h-4 mr-1" />Cash
                </Button>
                <Button
                  variant={paymentMethod === 'credit_card' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentMethod('credit_card')}
                >
                  <CreditCard className="w-4 h-4 mr-1" />Credit
                </Button>
                <Button
                  variant={paymentMethod === 'debit_card' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentMethod('debit_card')}
                >
                  <CreditCard className="w-4 h-4 mr-1" />Debit
                </Button>
                <Button
                  variant={paymentMethod === 'digital_wallet' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentMethod('digital_wallet')}
                >
                  <Smartphone className="w-4 h-4 mr-1" />Digital
                </Button>
              </div>
            </div>

            <div className="flex justify-between text-xl font-bold">
              <span>Total:</span>
              <span>{formatCurrency(getTotalAmount())}</span>
            </div>

            {orderSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg p-3 flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                {orderSuccess}
              </div>
            )}

            <Button
              className="w-full h-12 text-base"
              onClick={() => createOrderMutation.mutate()}
              disabled={createOrderMutation.isPending}
            >
              {createOrderMutation.isPending ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Processing...</>
              ) : (
                <><Check className="w-4 h-4 mr-2" />Place Order & Pay ({paymentMethod.replace('_', ' ')})</>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
