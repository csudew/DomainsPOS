import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Users, Star, TrendingUp, Plus, Edit2, Trash2, Crown, Search, X, Check } from 'lucide-react'
import type { LoyaltyTier, CreateLoyaltyTierRequest, LoyaltyCustomer } from '@/types'

const defaultTierForm: CreateLoyaltyTierRequest = {
  name: '',
  min_points: 0,
  discount_percent: 0,
  points_per_dollar: 1,
  color: '#6B7280',
  sort_order: 0,
}

export function AdminLoyalty() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'tiers' | 'members' | 'stats'>('tiers')
  const [showTierForm, setShowTierForm] = useState(false)
  const [editingTier, setEditingTier] = useState<LoyaltyTier | null>(null)
  const [tierForm, setTierForm] = useState<CreateLoyaltyTierRequest>(defaultTierForm)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberPage, setMemberPage] = useState(1)
  const [adjustPhone, setAdjustPhone] = useState('')
  const [adjustPoints, setAdjustPoints] = useState('')
  const [adjustDesc, setAdjustDesc] = useState('')
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null)

  const { data: tiersRes } = useQuery({
    queryKey: ['loyaltyTiers'],
    queryFn: () => apiClient.getLoyaltyTiers(),
  })
  const tiers: LoyaltyTier[] = tiersRes?.data || []

  const { data: statsRes } = useQuery({
    queryKey: ['loyaltyStats'],
    queryFn: () => apiClient.getLoyaltyStats(),
    enabled: activeTab === 'stats',
  })
  const stats = statsRes?.data

  const { data: membersRes } = useQuery({
    queryKey: ['loyaltyCustomers', memberPage, memberSearch],
    queryFn: () => apiClient.getLoyaltyCustomers({ page: memberPage, search: memberSearch || undefined }),
    enabled: activeTab === 'members',
  })
  const members: LoyaltyCustomer[] = (membersRes as any)?.data || []
  const membersMeta = (membersRes as any)?.meta

  const createTierMutation = useMutation({
    mutationFn: (data: CreateLoyaltyTierRequest) => apiClient.createLoyaltyTier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyaltyTiers'] })
      queryClient.invalidateQueries({ queryKey: ['loyaltyStats'] })
      setShowTierForm(false)
      setTierForm(defaultTierForm)
    },
  })

  const updateTierMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateLoyaltyTierRequest }) => apiClient.updateLoyaltyTier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyaltyTiers'] })
      setEditingTier(null)
      setTierForm(defaultTierForm)
      setShowTierForm(false)
    },
  })

  const deleteTierMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteLoyaltyTier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyaltyTiers'] })
      queryClient.invalidateQueries({ queryKey: ['loyaltyStats'] })
    },
  })

  const adjustMutation = useMutation({
    mutationFn: () => apiClient.adjustLoyaltyPoints(adjustPhone, parseInt(adjustPoints), adjustDesc || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyaltyCustomers'] })
      setAdjustSuccess(`Points adjusted for ${adjustPhone}`)
      setAdjustPhone('')
      setAdjustPoints('')
      setAdjustDesc('')
      setTimeout(() => setAdjustSuccess(null), 3000)
    },
  })

  const openCreate = () => {
    setEditingTier(null)
    setTierForm(defaultTierForm)
    setShowTierForm(true)
  }

  const openEdit = (tier: LoyaltyTier) => {
    setEditingTier(tier)
    setTierForm({
      name: tier.name,
      min_points: tier.min_points,
      discount_percent: tier.discount_percent,
      points_per_dollar: tier.points_per_dollar,
      color: tier.color,
      sort_order: tier.sort_order,
    })
    setShowTierForm(true)
  }

  const handleSaveTier = () => {
    if (editingTier) {
      updateTierMutation.mutate({ id: editingTier.id, data: tierForm })
    } else {
      createTierMutation.mutate(tierForm)
    }
  }

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(n)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Loyalty Program</h2>
          <p className="text-muted-foreground text-sm">Manage tiers, members, and point rewards</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        {(['tiers', 'members', 'stats'] as const).map(tab => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab)}
            className="capitalize"
          >
            {tab === 'tiers' && <Crown className="w-4 h-4 mr-1" />}
            {tab === 'members' && <Users className="w-4 h-4 mr-1" />}
            {tab === 'stats' && <TrendingUp className="w-4 h-4 mr-1" />}
            {tab}
          </Button>
        ))}
      </div>

      {/* Tiers Tab */}
      {activeTab === 'tiers' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreate} size="sm">
              <Plus className="w-4 h-4 mr-1" />New Tier
            </Button>
          </div>

          {/* Tier Form */}
          {showTierForm && (
            <Card className="border-2 border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{editingTier ? 'Edit Tier' : 'Create New Tier'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Tier Name *</label>
                    <Input
                      placeholder="e.g. Gold"
                      value={tierForm.name}
                      onChange={e => setTierForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={tierForm.color}
                        onChange={e => setTierForm(f => ({ ...f, color: e.target.value }))}
                        className="h-9 w-14 rounded border border-input cursor-pointer"
                      />
                      <Input
                        value={tierForm.color}
                        onChange={e => setTierForm(f => ({ ...f, color: e.target.value }))}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium">Min Points to Qualify</label>
                    <Input
                      type="number"
                      min="0"
                      value={tierForm.min_points}
                      onChange={e => setTierForm(f => ({ ...f, min_points: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Points per $1 Spent</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={tierForm.points_per_dollar}
                      onChange={e => setTierForm(f => ({ ...f, points_per_dollar: parseFloat(e.target.value) || 1 }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Discount %</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={tierForm.discount_percent}
                      onChange={e => setTierForm(f => ({ ...f, discount_percent: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Sort Order</label>
                    <Input
                      type="number"
                      value={tierForm.sort_order}
                      onChange={e => setTierForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => { setShowTierForm(false); setEditingTier(null) }}>
                    <X className="w-4 h-4 mr-1" />Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveTier}
                    disabled={!tierForm.name || createTierMutation.isPending || updateTierMutation.isPending}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    {editingTier ? 'Save Changes' : 'Create Tier'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tiers List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tiers.map(tier => (
              <Card key={tier.id} className="relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: tier.color }} />
                <CardHeader className="pb-2 pl-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: tier.color }} />
                      <CardTitle className="text-base">{tier.name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(tier)}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => { if (confirm(`Delete ${tier.name} tier?`)) deleteTierMutation.mutate(tier.id) }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pl-5 pt-0 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Min Points</span>
                    <span className="font-medium">{tier.min_points.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Points/Dollar</span>
                    <span className="font-medium">{tier.points_per_dollar}×</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <Badge variant="secondary">{tier.discount_percent}% off</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {tiers.length === 0 && (
              <div className="col-span-3 text-center py-12 text-muted-foreground">
                <Crown className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No loyalty tiers yet. Create one to get started.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* Search and adjust tools */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by phone or name..."
                value={memberSearch}
                onChange={e => { setMemberSearch(e.target.value); setMemberPage(1) }}
                className="pl-10"
              />
            </div>
            <Card className="p-3">
              <p className="text-sm font-medium mb-2">Adjust Points</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Phone number"
                  value={adjustPhone}
                  onChange={e => setAdjustPhone(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="±Points"
                  value={adjustPoints}
                  onChange={e => setAdjustPoints(e.target.value)}
                  className="w-24"
                />
                <Button
                  size="sm"
                  onClick={() => adjustMutation.mutate()}
                  disabled={!adjustPhone || !adjustPoints || adjustMutation.isPending}
                >
                  Apply
                </Button>
              </div>
              {adjustSuccess && <p className="text-sm text-green-600 mt-1">{adjustSuccess}</p>}
            </Card>
          </div>

          {/* Members table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-medium">Phone</th>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Tier</th>
                    <th className="text-right p-3 font-medium">Points</th>
                    <th className="text-right p-3 font-medium">Lifetime Spent</th>
                    <th className="text-left p-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m: LoyaltyCustomer) => (
                    <tr key={m.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3 font-mono">{m.phone}</td>
                      <td className="p-3 text-muted-foreground">{m.name || '—'}</td>
                      <td className="p-3">
                        {m.tier ? (
                          <Badge style={{ backgroundColor: m.tier.color + '20', color: m.tier.color, borderColor: m.tier.color + '40' }} variant="outline">
                            {m.tier.name}
                          </Badge>
                        ) : '—'}
                      </td>
                      <td className="p-3 text-right font-medium">{m.total_points.toLocaleString()}</td>
                      <td className="p-3 text-right">{formatCurrency(m.lifetime_spent)}</td>
                      <td className="p-3 text-muted-foreground text-xs">{new Date(m.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {members.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-muted-foreground">
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>No loyalty members found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {membersMeta && membersMeta.total_pages > 1 && (
              <div className="flex items-center justify-between p-3 border-t border-border">
                <span className="text-sm text-muted-foreground">
                  {membersMeta.total} members total
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setMemberPage(p => p - 1)} disabled={memberPage === 1}>
                    Previous
                  </Button>
                  <span className="text-sm py-1.5">{memberPage} / {membersMeta.total_pages}</span>
                  <Button variant="outline" size="sm" onClick={() => setMemberPage(p => p + 1)} disabled={memberPage === membersMeta.total_pages}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Users className="w-4 h-4" />Total Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.total_members?.toLocaleString() ?? '—'}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Star className="w-4 h-4" />Total Points Issued
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.total_points_issued?.toLocaleString() ?? '—'}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />Loyalty Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.total_spent != null ? formatCurrency(stats.total_spent) : '—'}</div>
              </CardContent>
            </Card>
          </div>

          {/* Members per tier */}
          {stats?.tiers && stats.tiers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Members by Tier</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.tiers.map((t: any) => {
                    const maxCount = Math.max(...stats.tiers.map((x: any) => x.member_count), 1)
                    return (
                      <div key={t.name} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                        <span className="w-20 text-sm font-medium">{t.name}</span>
                        <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ backgroundColor: t.color, width: `${(t.member_count / maxCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{t.member_count}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
