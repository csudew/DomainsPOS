import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/api/client'
import { toastHelpers } from '@/lib/toast-helpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Minus,
  ShoppingCart,
  User,
  Check,
  Clock,
  Search,
  Package,
  Car
} from 'lucide-react'
import type { Product } from '@/types'

interface CartItem {
  product: Product
  quantity: number
  special_instructions?: string
}

interface CreateOrderRequest {
  order_type: 'takeout' | 'delivery'
  customer_name?: string
  items: Array<{
    product_id: string
    quantity: number
    special_instructions?: string
  }>
  notes?: string
}

export function ServerInterface() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [orderType, setOrderType] = useState<'takeout' | 'delivery'>('takeout')
  const [customerName, setCustomerName] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderNotes, setOrderNotes] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const queryClient = useQueryClient()

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const response = await apiClient.getCategories()
        return response.data || []
      } catch (error) {
        console.error('Failed to fetch categories:', error)
        return []
      }
    }
  })

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['products', selectedCategory],
    queryFn: async () => {
      try {
        let response
        if (selectedCategory === 'all') {
          response = await apiClient.getProducts()
        } else {
          response = await apiClient.getProductsByCategory(selectedCategory)
        }
        return response.data || []
      } catch (error) {
        console.error('Failed to fetch products:', error)
        return []
      }
    }
  })

  // Create order mutation (use counter endpoint for all order types)
  const createOrderMutation = useMutation({
    mutationFn: (orderData: CreateOrderRequest) =>
      apiClient.createCounterOrder(orderData),
    onSuccess: (data) => {
      const orderNumber = data.data?.order_number
      // Reset form
      setCart([])
      setCustomerName('')
      setOrderNotes('')

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['orders'] })

      toastHelpers.orderCreated(orderNumber)
    },
    onError: (error: any) => {
      toastHelpers.apiError('Create order', error)
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
      order_type: orderType,
      customer_name: customerName || undefined,
      items: cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        special_instructions: item.special_instructions
      })),
      notes: orderNotes || undefined
    }

    createOrderMutation.mutate(orderData)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-background">
      {/* Left Sidebar - Categories and Products */}
      <div className="flex-1 lg:w-2/3 border-r border-border overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-border bg-card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold flex items-center truncate">
                <span className="hidden sm:inline">Server Station</span>
                <span className="sm:hidden">Server</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 hidden sm:block">Create takeout and delivery orders</p>
              <p className="text-xs text-muted-foreground mt-1 sm:hidden">Takeout / Delivery</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3 sm:mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 sm:h-11 text-sm sm:text-base touch-manipulation"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="whitespace-nowrap min-h-[44px] px-4 text-xs sm:text-sm touch-manipulation flex-shrink-0"
            >
              All Items
            </Button>
            {categories.map(category => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="whitespace-nowrap min-h-[44px] px-4 text-xs sm:text-sm touch-manipulation flex-shrink-0"
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {filteredProducts.map(product => {
              const cartItem = cart.find(item => item.product.id === product.id)
              return (
                <Card key={product.id} className="hover:shadow-md active:scale-95 transition-all duration-150 touch-manipulation">
                  <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm sm:text-base lg:text-lg leading-tight truncate">{product.name}</CardTitle>
                        {product.description && (
                          <CardDescription className="text-xs sm:text-sm mt-1 line-clamp-2">
                            {product.description.substring(0, 50)}
                            {product.description.length > 50 ? '...' : ''}
                          </CardDescription>
                        )}
                      </div>
                      <div className="text-sm sm:text-base lg:text-lg font-bold text-primary flex-shrink-0">
                        {formatCurrency(product.price)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 p-3 sm:p-6 sm:pt-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                        {product.preparation_time > 0 && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                            <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                            {product.preparation_time}min
                          </Badge>
                        )}
                        {!product.is_available && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                            Unavailable
                          </Badge>
                        )}
                      </div>

                      {product.is_available && (
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          {cartItem ? (
                            <div className="flex items-center gap-1 sm:gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeFromCart(product.id)}
                                className="min-h-[36px] min-w-[36px] p-1.5 sm:min-h-[44px] sm:min-w-[44px] sm:p-2 touch-manipulation"
                              >
                                <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <span className="w-6 sm:w-8 text-center font-medium text-sm sm:text-base">
                                {cartItem.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addToCart(product)}
                                className="min-h-[36px] min-w-[36px] p-1.5 sm:min-h-[44px] sm:min-w-[44px] sm:p-2 touch-manipulation"
                              >
                                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => addToCart(product)}
                              className="min-h-[36px] px-3 sm:min-h-[44px] sm:px-4 text-xs sm:text-sm touch-manipulation"
                            >
                              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              <span className="hidden sm:inline">Add</span>
                              <span className="sm:hidden">+</span>
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
        </div>
      </div>

      {/* Right Sidebar - Cart and Order */}
      <div className="w-full lg:w-1/3 flex flex-col bg-card max-h-screen lg:max-h-none">
        {/* Order Type Selection */}
        <div className="p-3 sm:p-4 border-b border-border flex-shrink-0">
          <h3 className="font-semibold mb-3 flex items-center text-sm sm:text-base">
            Order Type
          </h3>
          <div className="flex gap-2">
            <Button
              variant={orderType === 'takeout' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOrderType('takeout')}
              className="flex-1 min-h-[44px] touch-manipulation"
            >
              <Package className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              Takeout
            </Button>
            <Button
              variant={orderType === 'delivery' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOrderType('delivery')}
              className="flex-1 min-h-[44px] touch-manipulation"
            >
              <Car className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              Delivery
            </Button>
          </div>
        </div>

        {/* Customer Information */}
        <div className="p-3 sm:p-4 border-b border-border flex-shrink-0">
          <h3 className="font-semibold mb-3 flex items-center text-sm sm:text-base">
            <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Customer Information</span>
            <span className="sm:hidden">Customer</span>
          </h3>
          <Input
            placeholder="Customer name (optional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="h-10 sm:h-11 text-sm sm:text-base touch-manipulation"
          />
        </div>

        {/* Cart */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 sm:p-4">
            <h3 className="font-semibold mb-3 flex items-center text-sm sm:text-base">
              <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Order Items ({cart.length})</span>
              <span className="sm:hidden">Items ({cart.length})</span>
            </h3>
            
            {cart.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <ShoppingCart className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm sm:text-base font-medium">Ready to take an order</p>
                <p className="text-xs sm:text-sm mt-1">Add items from the menu to get started</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1 min-w-0 mr-2">
                      <div className="font-medium truncate text-sm sm:text-base">{item.product.name}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        {formatCurrency(item.product.price)} × {item.quantity}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <div className="font-medium text-sm sm:text-base">
                        {formatCurrency(item.product.price * item.quantity)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.product.id)}
                          className="min-h-[32px] min-w-[32px] p-1 sm:min-h-[36px] sm:min-w-[36px] sm:p-2 touch-manipulation"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 sm:w-8 text-center text-sm sm:text-base font-medium">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addToCart(item.product)}
                          className="min-h-[32px] min-w-[32px] p-1 sm:min-h-[36px] sm:min-w-[36px] sm:p-2 touch-manipulation"
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
                <label className="text-xs sm:text-sm font-medium">Order Notes</label>
                <Input
                  placeholder="Special requests or notes..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="mt-1 h-10 sm:h-11 text-sm sm:text-base touch-manipulation"
                />
              </div>
            )}
          </div>
        </div>

        {/* Order Summary and Actions */}
        {cart.length > 0 ? (
          <div className="p-3 sm:p-4 border-t border-border bg-card flex-shrink-0">
            <div className="space-y-3">
              {/* Order Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs sm:text-sm text-blue-700 capitalize">
                    {orderType}
                  </span>
                  <span className="text-xs sm:text-sm text-blue-700">
                    {cart.length} item{cart.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex justify-between text-base sm:text-lg font-semibold text-blue-900">
                  <span>Order Total:</span>
                  <span>{formatCurrency(getTotalAmount())}</span>
                </div>
              </div>

              {/* Action Button */}
              <Button
                className="w-full min-h-[48px] sm:min-h-[52px] text-sm sm:text-base font-semibold touch-manipulation"
                size="lg"
                onClick={handleCreateOrder}
                disabled={cart.length === 0 || createOrderMutation.isPending}
              >
                {createOrderMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    <span className="hidden sm:inline">Sending to Kitchen...</span>
                    <span className="sm:hidden">Sending...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Send Order to Kitchen</span>
                    <span className="sm:hidden">Send Order</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-3 sm:p-4 border-t border-border bg-card flex-shrink-0">
            <div className="text-center text-muted-foreground">
              <p className="text-sm sm:text-base font-medium">No items selected</p>
              <p className="text-xs sm:text-sm mt-1">Add items to start taking an order</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
