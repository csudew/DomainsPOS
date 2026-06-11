import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Clock,
  ChefHat,
  Package,
  CheckCircle,
  AlertCircle,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import apiClient from '@/api/client';
import type { User as UserType, Order } from '@/types';

interface NewEnhancedKitchenLayoutProps {
  user: UserType;
}

export function NewEnhancedKitchenLayout({ user }: NewEnhancedKitchenLayoutProps) {
  const [selectedTab, setSelectedTab] = useState('active-orders');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(0.7);

  // Fetch kitchen orders
  const { data: ordersResponse, isLoading, refetch, error } = useQuery({
    queryKey: ['newEnhancedKitchenOrders'],
    queryFn: () => apiClient.getKitchenOrders('all'),
    refetchInterval: autoRefresh ? 3000 : false,
    select: (data) => data.data || [],
  });

  const orders = ordersResponse || [];

  // Filter orders to only show kitchen-relevant statuses
  const kitchenRelevantOrders = orders.filter((order: Order) =>
    ['pending', 'confirmed', 'preparing', 'ready', 'completed'].includes(order.status)
  );

  // Group orders by status
  const ordersByStatus = {
    pending: kitchenRelevantOrders.filter((order: Order) => order.status === 'pending'),
    confirmed: kitchenRelevantOrders.filter((order: Order) => order.status === 'confirmed'),
    preparing: kitchenRelevantOrders.filter((order: Order) => order.status === 'preparing'),
    ready: kitchenRelevantOrders.filter((order: Order) => order.status === 'ready'),
    completed: kitchenRelevantOrders.filter((order: Order) => order.status === 'completed'),
  };

  // Calculate statistics based on kitchen-relevant orders only
  const stats = {
    total: kitchenRelevantOrders.filter((o: Order) => o.status !== 'completed').length,
    pending: ordersByStatus.pending.length,
    newOrders: ordersByStatus.confirmed.length,
    preparing: ordersByStatus.preparing.length,
    ready: ordersByStatus.ready.length,
    urgent: kitchenRelevantOrders.filter((order: Order) => {
      const created = new Date(order.created_at);
      const now = new Date();
      const minutesWaiting = Math.floor((now.getTime() - created.getTime()) / 1000 / 60);
      return minutesWaiting > 15;
    }).length,
  };

  // Handle logout
  const handleLogout = () => {
    apiClient.clearAuth();
    window.location.href = '/login';
  };

  // Handle order status update
  const handleOrderStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      await apiClient.updateOrderStatus(orderId, newStatus as Parameters<typeof apiClient.updateOrderStatus>[1]);
      refetch();
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  // Handle item status update
  const handleItemStatusUpdate = async (orderId: string, itemId: string, newStatus: string) => {
    try {
      await apiClient.updateOrderItemStatus(orderId, itemId, newStatus);
      refetch();
    } catch (error) {
      console.error('Failed to update item status:', error);
    }
  };

  // Handle individual item completion
  const handleItemServe = async (orderId: string, itemId: string, itemName: string) => {
    try {
      // Mark item as completed
      await apiClient.updateOrderItemStatus(orderId, itemId, 'completed');
      
      // Play notification sound
      if (soundEnabled) {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          // Different tone for individual item served (higher pitch)
          oscillator.frequency.setValueAtTime(1400, audioContext.currentTime);
          gainNode.gain.setValueAtTime(volume * 0.2, audioContext.currentTime);
          
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
          console.log('Sound notification failed:', error);
        }
      }
      
      // Show success message
      console.log(`${itemName} served to customer`);
      refetch();
    } catch (error) {
      console.error('Failed to serve item:', error);
    }
  };

  // Enhanced Order Card Component
  const EnhancedOrderCard = ({ order }: { order: Order }) => {
    const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
    
    const toggleItem = (itemId: string) => {
      const newChecked = new Set(checkedItems);
      if (newChecked.has(itemId)) {
        newChecked.delete(itemId);
      } else {
        newChecked.add(itemId);
      }
      setCheckedItems(newChecked);
      
      // Update item status
      const newStatus = newChecked.has(itemId) ? 'ready' : 'preparing';
      handleItemStatusUpdate(order.id, itemId, newStatus);
      
      // Auto-complete order if all items are checked
      if (order.items && newChecked.size === order.items.length) {
        setTimeout(() => {
          handleOrderStatusUpdate(order.id, 'ready');
        }, 500);
      }
    };

    const getUrgencyColor = () => {
      if (order.status === 'pending') return 'border-orange-500 bg-orange-50';
      const created = new Date(order.created_at);
      const now = new Date();
      const minutesWaiting = Math.floor((now.getTime() - created.getTime()) / 1000 / 60);

      if (minutesWaiting > 20) return 'border-red-500 bg-red-50';
      if (minutesWaiting > 10) return 'border-orange-500 bg-orange-50';
      return 'border-blue-500 bg-blue-50';
    };

    const waitTime = Math.floor((new Date().getTime() - new Date(order.created_at).getTime()) / 1000 / 60);

    // Mock items if none exist (for demo purposes)
    const displayItems = order.items && order.items.length > 0 ? order.items : [
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        order_id: order.id,
        product_id: 'p1b2c3d4-e5f6-7890-abcd-ef1234567890',
        quantity: 2,
        unit_price: 12.99,
        total_price: 25.98,
        special_instructions: 'No onions',
        status: 'preparing' as const,
        created_at: order.created_at,
        updated_at: order.updated_at,
        product: { id: 'p1b2c3d4-e5f6-7890-abcd-ef1234567890', name: 'Cheeseburger', price: 12.99, description: 'Beef patty with cheese', category_id: 'c1b2c3d4-e5f6-7890-abcd-ef1234567890', is_available: true, created_at: '', updated_at: '' }
      },
      {
        id: 'b2c3d4e5-f6g7-8901-bcde-f23456789012',
        order_id: order.id,
        product_id: 'p2c3d4e5-f6g7-8901-bcde-f23456789012',
        quantity: 1,
        unit_price: 4.99,
        total_price: 4.99,
        special_instructions: 'Extra crispy',
        status: 'preparing' as const,
        created_at: order.created_at,
        updated_at: order.updated_at,
        product: { id: 'p2c3d4e5-f6g7-8901-bcde-f23456789012', name: 'French Fries', price: 4.99, description: 'Crispy golden fries', category_id: 'c2c3d4e5-f6g7-8901-bcde-f23456789012', is_available: true, created_at: '', updated_at: '' }
      },
      {
        id: 'c3d4e5f6-g7h8-9012-cdef-345678901234',
        order_id: order.id,
        product_id: 'p3d4e5f6-g7h8-9012-cdef-345678901234',
        quantity: 1,
        unit_price: 2.99,
        total_price: 2.99,
        special_instructions: null,
        status: 'preparing' as const,
        created_at: order.created_at,
        updated_at: order.updated_at,
        product: { id: 'p3d4e5f6-g7h8-9012-cdef-345678901234', name: 'Coca Cola', price: 2.99, description: 'Refreshing cola drink', category_id: 'c3d4e5f6-g7h8-9012-cdef-345678901234', is_available: true, created_at: '', updated_at: '' }
      }
    ];

    // Calculate progress including completed items
    const totalItems = displayItems.length;
    const readyItems = checkedItems.size;
    const completedItems = displayItems.filter(item => item.status === 'completed').length;
    const progress = totalItems > 0 ? ((readyItems + completedItems) / totalItems) * 100 : 0;

    return (
      <Card className={cn("w-full", getUrgencyColor())}>
        <CardHeader className="pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
          <div className="flex items-center justify-between mb-1.5">
            <CardTitle className="text-xl sm:text-2xl font-bold">
              #{order.order_number}
            </CardTitle>
            <Badge
              variant={order.status === 'preparing' ? 'default' : 'destructive'}
              className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1"
            >
              {order.status === 'preparing' ? 'COOKING' : 'NEW'}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground mb-2">
            <span className="font-medium truncate">
              {order.order_type.replace('_', ' ').toUpperCase()} · {order.customer_name || 'Guest'}
            </span>
            <span className="font-medium shrink-0 ml-2">{waitTime}m</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {readyItems + completedItems}/{totalItems} done
          </div>
        </CardHeader>

        <CardContent className="space-y-3 px-3 sm:px-6 pb-3 sm:pb-6">
          {/* Order Items with Checkboxes */}
          <div className="space-y-2">
            {displayItems.map((item, index) => {
              const isServed = item.status === 'completed';
              const isReady = checkedItems.has(item.id);

              return (
                <div key={item.id} className={cn(
                  "flex items-center gap-3 p-2.5 sm:p-3 rounded-lg border-2 transition-colors",
                  isServed ? "bg-gray-50 border-gray-200 opacity-60" : "bg-white border-gray-100 active:border-green-200"
                )}>
                  <button
                    onClick={() => !isServed && toggleItem(item.id)}
                    disabled={isServed}
                    className={cn(
                      "w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0",
                      isServed
                        ? "bg-gray-300 border-gray-300 text-white cursor-not-allowed"
                        : isReady
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-gray-300 active:bg-green-50"
                    )}
                  >
                    {(isReady || isServed) && <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "font-semibold text-sm sm:text-base leading-tight",
                      (isServed || isReady) && "line-through text-muted-foreground"
                    )}>
                      {item.quantity}× {item.product?.name || `Item ${index + 1}`}
                    </div>
                    {item.special_instructions && (
                      <div className="text-xs mt-0.5 text-yellow-700 bg-yellow-50 rounded px-1.5 py-0.5 inline-block">
                        {item.special_instructions}
                      </div>
                    )}
                  </div>

                  <div className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full shrink-0",
                    isServed ? "bg-gray-100 text-gray-500" : isReady ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                  )}>
                    {isServed ? 'Done' : isReady ? 'Ready' : 'Cooking'}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Order Notes */}
          {order.notes && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
              <p className="text-blue-800 text-xs"><strong>Note:</strong> {order.notes}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            {(order.status === 'pending' || order.status === 'confirmed' || order.status === 'ready') && (
              <Button
                onClick={() => handleOrderStatusUpdate(order.id, 'preparing')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 h-11 sm:h-12 text-sm sm:text-base"
              >
                <ChefHat className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" />
                Start Cooking
              </Button>
            )}
            {order.status === 'preparing' && (
              <Button
                onClick={() => handleOrderStatusUpdate(order.id, 'ready')}
                className="flex-1 bg-green-600 hover:bg-green-700 h-11 sm:h-12 text-sm sm:text-base"
              >
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" />
                Mark Ready
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Takeaway Board Component
  const TakeawayBoard = () => {
    // Only show takeaway orders that are ready but not yet completed
    const takeawayOrders = kitchenRelevantOrders.filter(order =>
      (order.order_type === 'takeout' || order.order_type === 'delivery') && order.status === 'ready'
    );

    if (takeawayOrders.length === 0) {
      return (
        <div className="text-center py-8">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No takeaway orders ready</p>
        </div>
      );
    }

    return (
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {takeawayOrders.map((order) => {
          const waitTime = Math.floor((new Date().getTime() - new Date(order.updated_at).getTime()) / 1000 / 60);

          return (
            <Card key={order.id} className="border-2 border-green-500 bg-green-50">
              <CardContent className="p-4 flex items-center gap-4">
                {/* Order number — large and prominent */}
                <div className="text-center shrink-0">
                  <div className="text-3xl sm:text-4xl font-black text-green-800 leading-none">
                    #{order.order_number}
                  </div>
                  <div className="text-xs text-green-600 mt-0.5">{waitTime}m waiting</div>
                </div>
                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-green-900 truncate">
                    {order.customer_phone || order.customer_name || 'Guest'}
                  </div>
                  <div className="text-sm text-green-700 mt-0.5">
                    {order.items?.map(i => `${i.quantity}× ${i.product?.name}`).join(', ')}
                  </div>
                  <Badge variant="outline" className="text-xs text-green-700 border-green-400 mt-1.5">
                    Ready for pickup
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // Sound Settings Panel
  const SoundSettingsPanel = () => (
    <Card className="w-full max-w-xs sm:w-80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Sound Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Enable Sounds</label>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(
              "w-12 h-6 rounded-full transition-colors",
              soundEnabled ? "bg-blue-600" : "bg-gray-300"
            )}
          >
            <div className={cn(
              "w-5 h-5 rounded-full bg-white transition-transform",
              soundEnabled ? "translate-x-6" : "translate-x-1"
            )} />
          </button>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Volume</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => {
              // Play a simple beep sound for new order
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
              gainNode.gain.setValueAtTime(volume * 0.3, audioContext.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
              
              oscillator.start(audioContext.currentTime);
              oscillator.stop(audioContext.currentTime + 0.5);
            }}
          >
            Test New Order
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => {
              // Play a different beep sound for ready order
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
              gainNode.gain.setValueAtTime(volume * 0.3, audioContext.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
              
              oscillator.start(audioContext.currentTime);
              oscillator.stop(audioContext.currentTime + 0.3);
            }}
          >
            Test Ready
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3">
        {/* Row 1: logo + title + action buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="w-9 h-9 sm:w-12 sm:h-12 bg-orange-600 rounded-lg flex items-center justify-center shrink-0">
              <ChefHat className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-2xl font-bold text-gray-900 leading-tight">Kitchen Display</h1>
              <p className="text-xs text-gray-500">{user.first_name} · {stats.total} active</p>
            </div>
          </div>

          {/* Controls — always visible, compact on mobile */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Live indicator — text hidden on mobile */}
            <div className="hidden sm:flex items-center gap-1.5 mr-1">
              <div className={cn("w-2 h-2 rounded-full", autoRefresh ? "bg-green-500 animate-pulse" : "bg-gray-300")} />
              <span className="text-xs text-gray-500">{autoRefresh ? 'Live' : 'Paused'}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="h-8 w-8 p-0">
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            </Button>
            <Button variant={autoRefresh ? "default" : "outline"} size="sm" onClick={() => setAutoRefresh(!autoRefresh)} className="h-8 w-8 p-0">
              <Clock className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSoundSettings(!showSoundSettings)} className="h-8 w-8 p-0">
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Row 2: status badges (scrollable on mobile) */}
        <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-0.5 scrollbar-none">
          <Badge variant="destructive" className="text-xs shrink-0">
            {stats.total - stats.preparing} New
          </Badge>
          <Badge variant="default" className="text-xs shrink-0">
            {stats.preparing} Cooking
          </Badge>
          <Badge variant="outline" className="text-xs shrink-0 text-green-700 border-green-300">
            {stats.ready} Ready
          </Badge>
          {stats.urgent > 0 && (
            <Badge variant="destructive" className="text-xs shrink-0 animate-pulse">
              {stats.urgent} Urgent!
            </Badge>
          )}
        </div>
      </div>

      {/* Sound Settings Overlay */}
      {showSoundSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-xs sm:w-80">
            <SoundSettingsPanel />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSoundSettings(false)}
              className="absolute -top-2 -right-2 w-7 h-7 p-0 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-3 sm:p-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
            <TabsTrigger value="active-orders" className="text-sm sm:text-lg py-2.5 sm:py-3">
              <ChefHat className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
              <span className="hidden xs:inline">Active Orders </span>({stats.total})
            </TabsTrigger>
            <TabsTrigger value="takeaway-ready" className="text-sm sm:text-lg py-2.5 sm:py-3">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
              <span className="hidden xs:inline">Takeaway Ready </span>({kitchenRelevantOrders.filter(o => o.order_type === 'takeout' && o.status === 'ready').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active-orders" className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                  <p className="text-gray-500">Loading kitchen orders...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-600" />
                  <p className="text-red-600">Failed to load orders</p>
                  <Button onClick={() => refetch()} className="mt-2">
                    Try Again
                  </Button>
                </div>
              </div>
            ) : stats.total === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <ChefHat className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Orders</h3>
                  <p className="text-gray-500">Kitchen is all caught up! 🎉</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {kitchenRelevantOrders
                  .filter((order: Order) => order.status !== 'completed')
                  .map((order: Order) => (
                  <EnhancedOrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="takeaway-ready">
            <TakeawayBoard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
