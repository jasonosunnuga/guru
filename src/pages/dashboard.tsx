// src/pages/dashboard.tsx

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/card';
import { Badge } from '@/components/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/dialog';
import { Textarea } from '@/components/textarea';
import { ScrollArea } from '@/components/scroll-area';
import { Separator } from '@/components/separator';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/select';

import {
  Search,
  Filter,
  Phone,
  Mail,
  Calendar,
  User,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  Edit,
  RefreshCw,
  TrendingUp,
  Users,
  BarChart3
} from 'lucide-react';

type Query = {
  id: string;
  resident_name: string;
  resident_email: string;
  resident_phone: string;
  service_type: string;
  priority: string;
  status: 'pending' | 'in_progress' | 'complete' | 'requires_info' | 'cancelled';
  created_at: string;
  staff_notes?: string;
  conversation_log?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  collected_data?: Record<string, any>;
};

export default function DashboardPage() {
  const [queries, setQueries] = useState<Query[]>([]);
  const [filteredQueries, setFilteredQueries] = useState<Query[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Query['status']>('all');
  const [serviceFilter, setServiceFilter] = useState<'all' | string>('all');
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [staffNotes, setStaffNotes] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    today: 0
  });

  // wrap async in effect
  useEffect(() => {
    async function doLoad() {
      await loadQueries();
    }
    doLoad();

    const channel = supabase
      .channel('public:queries')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queries' }, () => {
        loadQueries();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // recalc filtered when dependencies change
  useEffect(() => {
    let filtered = queries;
    if (searchTerm) {
      filtered = filtered.filter(q =>
        q.resident_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.resident_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.service_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(q => q.status === statusFilter);
    }
    if (serviceFilter !== 'all') {
      filtered = filtered.filter(q => q.service_type === serviceFilter);
    }
    setFilteredQueries(filtered);
  }, [queries, searchTerm, statusFilter, serviceFilter]);

  async function loadQueries() {
    setLoading(true);
    try {
      // build query builder conditionally
      let qb = supabase.from('queries').select('*').order('created_at', { ascending: false });
      const { data, error } = await qb;
      if (error) throw error;
      const list = data as Query[];
      setQueries(list);
      // compute stats
      const today = new Date().toDateString();
      setStats({
        total: list.length,
        pending: list.filter(q => q.status === 'pending').length,
        inProgress: list.filter(q => q.status === 'in_progress').length,
        completed: list.filter(q => q.status === 'complete').length,
        today: list.filter(q => new Date(q.created_at).toDateString() === today).length
      });
    } catch (e) {
      console.error('Error loading queries:', e);
    } finally {
      setLoading(false);
    }
  }

  async function updateQueryStatus(id: string, status: Query['status']) {
    try {
      const { error } = await supabase.from('queries').update({ status }).eq('id', id);
      if (error) throw error;
      await loadQueries();
    } catch (e) {
      console.error('Error updating status:', e);
    }
  }

  async function updateStaffNotes(id: string, notes: string) {
    try {
      const { error } = await supabase.from('queries').update({ staff_notes: notes }).eq('id', id);
      if (error) throw error;
      setSelectedQuery(prev => prev ? { ...prev, staff_notes: notes } : null);
    } catch (e) {
      console.error('Error updating notes:', e);
    }
  }

  function getStatusIcon(status: Query['status']) {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <RefreshCw className="h-4 w-4" />;
      case 'complete': return <CheckCircle className="h-4 w-4" />;
      case 'requires_info': return <AlertCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  }

  function getStatusColor(status: Query['status']) {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'complete': return 'bg-green-100 text-green-800';
      case 'requires_info': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-4">Staff Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
        <Card><CardHeader><CardTitle>Total</CardTitle></CardHeader><CardContent><BarChart3 className="h-6 w-6 text-blue-600"/> {stats.total}</CardContent></Card>
        <Card><CardHeader><CardTitle>Pending</CardTitle></CardHeader><CardContent><Clock className="h-6 w-6 text-yellow-600"/> {stats.pending}</CardContent></Card>
        <Card><CardHeader><CardTitle>In Progress</CardTitle></CardHeader><CardContent><RefreshCw className="h-6 w-6 text-blue-600"/> {stats.inProgress}</CardContent></Card>
        <Card><CardHeader><CardTitle>Completed</CardTitle></CardHeader><CardContent><CheckCircle className="h-6 w-6 text-green-600"/> {stats.completed}</CardContent></Card>
        <Card><CardHeader><CardTitle>Today</CardTitle></CardHeader><CardContent><Calendar className="h-6 w-6 text-purple-600"/> {stats.today}</CardContent></Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"/>
            <Input placeholder="Search..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
          </div>
          <Select value={statusFilter} onValueChange={(v: Query['status']|'all') => setStatusFilter(v)}>
            <SelectTrigger className="w-48"/><SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="complete">Completed</SelectItem>
              <SelectItem value="requires_info">Requires Info</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={serviceFilter} onValueChange={(v: string) => setServiceFilter(v)}>
            <SelectTrigger className="w-48"/><SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              <SelectItem value="blue_badge">Blue Badge</SelectItem>
              <SelectItem value="missed_bin">Missed Bin</SelectItem>
              <SelectItem value="housing_benefit">Housing Benefit</SelectItem>
              <SelectItem value="pothole_report">Pothole</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Query List */}
      <div className="space-y-4">
        {filteredQueries.map(q => (
          <Card key={q.id}>
            <CardHeader>
              <div className="flex justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${getPriorityColor(q.priority)}`}></span>
                  <h3 className="font-semibold">{q.resident_name}</h3>
                  <Badge className={getStatusColor(q.status)}>{getStatusIcon(q.status)}<span className="ml-1">{q.status.replace('_',' ')}</span></Badge>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setSelectedQuery(q); setStaffNotes(q.staff_notes||''); }}>
                  <Eye className="h-4 w-4"/>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-2">
                <div><Mail className="h-4 w-4 inline"/> {q.resident_email}</div>
                <div><Phone className="h-4 w-4 inline"/> {q.resident_phone||'N/A'}</div>
                <div><Clock className="h-4 w-4 inline"/> {format(new Date(q.created_at),'MMM d, yyyy')}</div>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <span>{q.service_type.replace('_',' ')}</span>
                <Separator orientation="vertical"/>
                <span>{q.priority}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail Dialog */}
      {selectedQuery && (
        <Dialog open onOpenChange={() => setSelectedQuery(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Details for {selectedQuery.resident_name}</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="details">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="conversation">Conversation</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>
              <TabsContent value="details">
                <div className="space-y-2">
                  <p><strong>Email:</strong> {selectedQuery.resident_email}</p>
                  <p><strong>Phone:</strong> {selectedQuery.resident_phone}</p>
                  <p><strong>Service:</strong> {selectedQuery.service_type}</p>
                  <p><strong>Priority:</strong> {selectedQuery.priority}</p>
                </div>
              </TabsContent>
              <TabsContent value="conversation">
                <ScrollArea className="h-64">
                  {selectedQuery.conversation_log?.map((m,i)=>(
                    <div key={i} className={`p-2 ${m.role==='user'?'bg-blue-50':'bg-gray-50'} mb-1 rounded`}>
                      <p className="text-xs text-gray-500">{new Date(m.timestamp).toLocaleTimeString()}</p>
                      <p>{m.content}</p>
                    </div>
                  )) || <p>No conversation</p>}
                </ScrollArea>
              </TabsContent>
              <TabsContent value="actions">
                <Textarea value={staffNotes} onChange={e => setStaffNotes(e.target.value)} placeholder="Staff notes"/>
                <Button onClick={() => updateStaffNotes(selectedQuery.id, staffNotes)}>Save Notes</Button>
                <Button onClick={() => updateQueryStatus(selectedQuery.id, 'in_progress')}>Mark In Progress</Button>
                <Button onClick={() => updateQueryStatus(selectedQuery.id, 'complete')}>Mark Complete</Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
