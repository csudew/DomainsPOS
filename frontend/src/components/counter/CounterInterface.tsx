import { useState } from 'react'
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
  Receipt
} from 'lucide-react'
import type { Product, Order } from '@/types'

interface CartItem {
  product: Product
  quantity: number
  special_instructions?: string
}

interface CreateOrderRequest {
  customer_name?: string
  order_type: 'takeout' | 'delivery'
  items: Array<{
    product_id: string
    quantity: number
    special_instructions?: string
  }>
  notes?: string
}

interface ProcessPaymentRequest {
  payment_method: 'cash' | 'credit_card' | 'debit_card' | 'digital_wallet'
  amount: number
  reference_number?: string
}

export function CounterInterface() {
  const [activeTab, setActiveTab] = useState<'create' | 'payment'>('create')
  const [orderType, setOrderType] = useState<'takeout' | 'delivery'>('takeout')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [customerName, setCustomerName] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderNotes, setOrderNotes] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Payment states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit_card' | 'debit_card' | 'digital_wallet'>('cash')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  
  const queryClient = useQueryClient()

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient.getCategories().then(res => res.data)
  })

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['products', selectedCategory],
    queryFn: () => {
      if (selectedCategory === 'all') {
        return apiClient.getProducts().then(res => res.data)
      } else {
        return apiClient.getProductsByCategory(selectedCategory).then(res => res.data)
      }
    }
  })

  // Fetch pending orders for payment processing
  const { data: pendingOrders = [] } = useQuery({
    queryKey: ['pendingOrders'],
    queryFn: () => apiClient.getOrders({ status: 'ready' }).then(res => res.data)
  })

  // Create order mutation (counter endpoint - all order types)
  const createOrderMutation = useMutation({
    mutationFn: (orderData: CreateOrderRequest) => 
      apiClient.createCounterOrder(orderData),
    onSuccess: () => {
      // Reset form
      setCart([])
      setCustomerName('')
      setOrderNotes('')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    }
  })

  // Process payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: ({ orderId, paymentData }: { orderId: string, paymentData: ProcessPaymentRequest }) => 
      apiClient.processCounterPayment(orderId, paymentData),
    onSuccess: () => {
      // Reset payment form
      setSelectedOrder(null)
      setPaymentAmount('')
      setReferenceNumber('')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['pendingOrders'] })
    }
  })

  // Filter products based on search
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  )

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id)
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, { product, quantity: 1 }])
    }
  }

  const removeFromCart = (productId: string) => {
    const existingItem = cart.find(item => item.product.id === productId)
    
    if (existingItem && existingItem.quantity > 1) {
      setCart(cart.map(item =>
        item.product.id === productId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ))
    } else {
      setCart(cart.filter(item => item.product.id !== productId))
    }
  }

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0)
  }

  const handleCreateOrder = () => {
    if (cart.length === 0) return

    const orderData: CreateOrderRequest = {
      customer_name: customerName || undefined,
      order_type: orderType,
      items: cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        special_instructions: item.special_instructions
      })),
      notes: orderNotes || undefined
    }

    createOrderMutation.mutate(orderData)
  }

  const handleProcessPayment = () => {
    if (!selectedOrder || !paymentAmount) return

    const paymentData: ProcessPaymentRequest = {
      payment_method: paymentMethod,
      amount: parseFloat(paymentAmount),
      reference_number: referenceNumber || undefined
    }

    processPaymentMutation.mutate({ 
      orderId: selectedOrder.id, 
      paymentData 
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getOrderTypeIcon = (type: string) => {
    switch (type) {
      case 'takeout': return <Package className="w-4 h-4" />
      case 'delivery': return <Car className="w-4 h-4" />
      default: return <ShoppingCart className="w-4 h-4" />
    }
  }

  const getOrderTypeBadge = (type: string) => {
    const configs = {
      takeout: { label: 'Takeout', color: 'bg-green-100 text-green-800' },
      delivery: { label: 'Delivery', color: 'bg-purple-100 text-purple-800' }
    }
    const config = configs[type as keyof typeof configs] || configs.takeout
    return <Badge className={config.color}>{config.label}</Badge>
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Products and Orders */}
      <div className="w-2/3 border-r border-border overflow-hidden flex flex-col">
        {/* Header with Tabs */}
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Counter / Checkout</h1>
              <p className="text-muted-foreground">Create orders and process payments</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'create' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('create')}
              >
                <Plus className="w-4 h-4 mr-1" />
                Create Order
              </Button>
              <Button
                variant={activeTab === 'payment' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('payment')}
              >
                <CreditCard className="w-4 h-4 mr-1" />
                Process Payment
              </Button>
            </div>
          </div>

          {activeTab === 'create' && (
            <>
              {/* Order Type Selection */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant={orderType === 'takeout' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOrderType('takeout')}
                >
                  <Package className="w-4 h-4 mr-1" />
                  Takeout
                </Button>
                <Button
                  variant={orderType === 'delivery' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOrderType('delivery')}
                >
                  <Car className="w-4 h-4 mr-1" />
                  Delivery
                </Button>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 overflow-x-auto">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                >
                  All Items
                </Button>
                {categories.map(category => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'create' ? (
            /* Products Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(product => {
                const cartItem = cart.find(item => item.product.id === product.id)
                return (
                  <Card key={product.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg leading-tight">{product.name}</CardTitle>
                          {product.description && (
                            <CardDescription className="text-sm mt-1">
                              {product.description.substring(0, 60)}
                              {product.description.length > 60 ? '...' : ''}
                            </CardDescription>
                          )}
                        </div>
                        <div className="text-lg font-bold text-primary">
                          {formatCurrency(product.price)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {product.preparation_time > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              {product.preparation_time}min
                            </Badge>
                          )}
                          {!product.is_available && (
                            <Badge variant="secondary" className="text-xs">
                              Unavailable
                            </Badge>
                          )}
                        </div>

                        {product.is_available && (
                          <div className="flex items-center gap-2">
                            {cartItem ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeFromCart(product.id)}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-medium">
                                  {cartItem.quantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addToCart(product)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => addToCart(product)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            /* Payment Processing - Orders List */
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Orders Ready for Payment</h3>
              {pendingOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No orders ready for payment</p>
                </div>
              ) : (
                pendingOrders.map(order => (
                  <Card 
                    key={order.id} 
                    className={`cursor-pointer transition-all ${
                      selectedOrder?.id === order.id ? 'ring-2 ring-primary' : 'hover:shadow-md'
                    }`}
                    onClick={() => {
                      setSelectedOrder(order)
                      setPaymentAmount(order.total_amount.toString())
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getOrderTypeIcon(order.order_type)}
                          <div>
                            <div className="font-semibold">Order #{order.order_number}</div>
                            <div className="text-sm text-muted-foreground">
                              {order.customer_name && `${order.customer_name} • `}
                              {order.items?.length || 0} items
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{formatCurrency(order.total_amount)}</div>
                          <div className="flex items-center gap-2">
                            {getOrderTypeBadge(order.order_type)}
                            <Badge variant="outline" className="text-xs">
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-1/3 flex flex-col bg-card">
        {activeTab === 'create' ? (
          /* Create Order Interface */
          <>
            {/* Customer Information */}
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold mb-2">Customer Information</h3>
              <Input
                placeholder="Customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            {/* Cart */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <h3 className="font-semibold mb-3 flex items-center">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Order Items ({cart.length})
                </h3>
                
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No items in order</p>
                    <p className="text-sm">Add items from the menu to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.product.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{item.product.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(item.product.price)} × {item.quantity}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <div className="font-medium">
                            {formatCurrency(item.product.price * item.quantity)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromCart(item.product.id)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center text-sm">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => addToCart(item.product)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Order Notes */}
                {cart.length > 0 && (
                  <div className="mt-4">
                    <label className="text-sm font-medium">Order Notes</label>
                    <Input
                      placeholder="Special requests or notes..."
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Order Summary and Actions */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-border bg-card">
                <div className="space-y-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span>{formatCurrency(getTotalAmount())}</span>
                  </div>
                  
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleCreateOrder}
                    disabled={cart.length === 0 || createOrderMutation.isPending}
                  >
                    {createOrderMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Creating Order...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Create {orderType === 'takeout' ? 'Takeout' : 'Delivery'} Order
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Payment Processing Interface */
          <>
            {selectedOrder ? (
              <>
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold mb-3">Payment Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Order:</span>
                      <span>#{selectedOrder.order_number}</span>
                    </div>
                    {selectedOrder.customer_name && (
                      <div className="flex justify-between">
                        <span>Customer:</span>
                        <span>{selectedOrder.customer_name}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total:</span>
                      <span>{formatCurrency(selectedOrder.total_amount)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Payment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentMethod('cash')}
                      >
                        <DollarSign className="w-4 h-4 mr-1" />
                        Cash
                      </Button>
                      <Button
                        variant={paymentMethod === 'credit_card' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentMethod('credit_card')}
                      >
                        <CreditCard className="w-4 h-4 mr-1" />
                        Credit
                      </Button>
                      <Button
                        variant={paymentMethod === 'debit_card' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentMethod('debit_card')}
                      >
                        <CreditCard className="w-4 h-4 mr-1" />
                        Debit
                      </Button>
                      <Button
                        variant={paymentMethod === 'digital_wallet' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentMethod('digital_wallet')}
                      >
                        Digital
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Payment Amount</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                  </div>

                  {paymentMethod !== 'cash' && (
                    <div>
                      <label className="text-sm font-medium mb-1 block">Reference Number</label>
                      <Input
                        placeholder="Transaction reference"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                      />
                    </div>
                  )}

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleProcessPayment}
                    disabled={!paymentAmount || processPaymentMutation.isPending}
                  >
                    {processPaymentMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Process Payment
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Select an order to process payment</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
