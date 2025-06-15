// src/pages/index.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Query } from '@/types/database';
import Link from 'next/link';
import { Phone, PhoneCall, Users, BarChart3, Clock, CheckCircle, Bot, Headphones, FileText, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';
import { Badge } from '@/components/badge';
import { Alert, AlertDescription } from '@/components/alert';

export default function Home() {
  const [queries, setQueries] = useState<Query[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalQueries: 0,
    todayQueries: 0,
    pendingQueries: 0,
    completedQueries: 0
  });

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Load existing queries
    loadQueries();

    // Subscribe to new INSERT events on the 'queries' table
    const channel = supabase!
      .channel('public:queries')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'queries' },
        (payload) => {
          const newQuery = payload.new as Query;
          setQueries((prev) => [newQuery, ...prev]);
          updateStats();
        }
      )
      .subscribe();

    return () => {
      supabase!.removeChannel(channel);
    };
  }, []);

  const loadQueries = async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('queries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading queries:', error);
      } else {
        setQueries(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }

    updateStats();
  };

  const updateStats = async () => {
    if (!supabase) return;

    try {
      const { data: allQueries } = await supabase
        .from('queries')
        .select('status, created_at');

      if (allQueries) {
        const today = new Date().toDateString();
        const todayQueries = allQueries.filter(q => 
          new Date(q.created_at).toDateString() === today
        ).length;

        setStats({
          totalQueries: allQueries.length,
          todayQueries,
          pendingQueries: allQueries.filter(q => q.status === 'pending').length,
          completedQueries: allQueries.filter(q => q.status === 'completed').length
        });
      }
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Configuration Alert */}
        {!supabase && (
          <Alert className="mb-8 border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Configuration Required:</strong> Please set up your environment variables in <code>.env.local</code> to enable database functionality. 
              Check the file for required Supabase, OpenAI, Twilio, and SendGrid credentials.
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="text-center mb-12 relative">
          <div className="flex items-center justify-center mb-6">
            <Link href="/">
              <button className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400">
                <Bot className="h-12 w-12 text-white" />
              </button>
            </Link>
          </div>
          <div className="absolute top-0 right-0 mt-4 mr-4">
            <Link href="/">
              <Button variant={"outline" as const}>Home</Button>
            </Link>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Meet <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Guru</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Your intelligent AI assistant for council services. Experience seamless, natural conversations 
            that transform complex bureaucratic processes into simple, guided interactions.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/chat">
              <Button size={"lg" as const} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 text-lg">
                <PhoneCall className="mr-2 h-5 w-5" />
                Try Chat Demo
              </Button>
            </Link>
            <Button variant={"outline" as const} size={"lg" as const} className="px-8 py-4 text-lg border-2">
              <Phone className="mr-2 h-5 w-5" />
              Call: +44 123 456 7890
            </Button>
            <Link href="/dashboard">
              <Button variant={"outline" as const} size={"lg" as const} className="px-8 py-4 text-lg border-2">
                <Users className="mr-2 h-5 w-5" />
                Staff Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Total Queries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalQueries}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.todayQueries}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pendingQueries}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.completedQueries}</div>
            </CardContent>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Headphones className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle className="text-lg">Natural Conversation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Speak naturally with Guru. No complex menus or technical jargon - just human-like conversation.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-green-600 mb-2" />
              <CardTitle className="text-lg">Smart Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                AI-powered understanding of your needs with real-time guidance and validation.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <FileText className="h-8 w-8 text-purple-600 mb-2" />
              <CardTitle className="text-lg">Complete Documentation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Every interaction is logged with structured data and actionable insights for staff.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Shield className="h-8 w-8 text-orange-600 mb-2" />
              <CardTitle className="text-lg">Secure & Private</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Enterprise-grade security with GDPR compliance and data protection built-in.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Available Services */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">Available Council Services</CardTitle>
            <CardDescription>
              Guru can help you with all these services and more through natural conversation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: 'Blue Badge Application', category: 'Accessibility', priority: 'medium' },
                { name: 'Missed Bin Collection', category: 'Waste', priority: 'medium' },
                { name: 'Housing Benefit', category: 'Benefits', priority: 'high' },
                { name: 'Pothole Reporting', category: 'Highways', priority: 'medium' },
                { name: 'Planning Permission', category: 'Planning', priority: 'low' },
                { name: 'Noise Complaints', category: 'Environmental', priority: 'medium' },
                { name: 'Council Tax Reduction', category: 'Finance', priority: 'high' },
                { name: 'Street Lighting', category: 'Highways', priority: 'medium' },
                { name: 'Library Services', category: 'Community', priority: 'low' }
              ].map((service) => (
                <div key={service.name} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div>
                    <h3 className="font-medium text-gray-900">{service.name}</h3>
                    <p className="text-sm text-gray-600">{service.category}</p>
                  </div>
                  <Badge variant={service.priority === 'high' ? 'destructive' as const : service.priority === 'medium' ? 'default' as const : 'secondary' as const}>
                    {service.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        {supabase && queries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Recent Activity</CardTitle>
              <CardDescription>Latest queries processed by Guru</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {queries.slice(0, 5).map((query) => (
                  <div key={query.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{query.resident_name}</h4>
                      <p className="text-sm text-gray-600 capitalize">
                        {query.service_type.replace('_', ' ')} - {query.priority} priority
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={
                          query.status === 'completed' ? 'default' as const :
                          query.status === 'pending' ? 'secondary' as const :
                          query.status === 'in_progress' ? 'outline' as const : 'destructive' as const
                        }
                      >
                        {query.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(query.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {queries.length > 5 && (
                <div className="mt-4 text-center">
                  <Button variant={"outline" as const} asChild>
                    <Link href="/dashboard">View All Queries</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {loading && supabase && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading recent activity...</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
