import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../utils/api';
import { Users, Mail, Shield, Activity } from 'lucide-react';

interface Stats {
  totalUsers: number;
  pendingInvites: number;
  recentActions: number;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    pendingInvites: 0,
    recentActions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [usersRes, invitesRes, auditRes] = await Promise.allSettled([
        api.get('/users'),
        api.get('/invites'),
        api.get('/audit?limit=10')
      ]);

      setStats({
        totalUsers: usersRes.status === 'fulfilled' ? usersRes.value.data.users.length : 0,
        pendingInvites: invitesRes.status === 'fulfilled' 
          ? invitesRes.value.data.invites.filter((inv: any) => !inv.acceptedAt).length : 0,
        recentActions: auditRes.status === 'fulfilled' ? auditRes.value.data.auditLogs.length : 0
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      description: 'Active organization members'
    },
    {
      name: 'Pending Invites',
      value: stats.pendingInvites,
      icon: Mail,
      color: 'bg-amber-500',
      description: 'Awaiting acceptance'
    },
    {
      name: 'Recent Activity',
      value: stats.recentActions,
      icon: Activity,
      color: 'bg-green-500',
      description: 'Actions in audit log'
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="mt-2 text-gray-600">
          Here's what's happening in your organization today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div className={`${stat.color} rounded-md p-3`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.description}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => window.location.href = '/invites'}
                className="p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <Mail className="h-8 w-8 text-blue-600 mb-2" />
                <h3 className="font-medium text-gray-900">Send Invites</h3>
                <p className="text-sm text-gray-500">Invite new team members</p>
              </button>
            )}

            {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
              <button
                onClick={() => window.location.href = '/users'}
                className="p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <Users className="h-8 w-8 text-green-600 mb-2" />
                <h3 className="font-medium text-gray-900">Manage Users</h3>
                <p className="text-sm text-gray-500">View and manage team members</p>
              </button>
            )}

            {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
              <button
                onClick={() => window.location.href = '/audit'}
                className="p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <Shield className="h-8 w-8 text-purple-600 mb-2" />
                <h3 className="font-medium text-gray-900">View Audit Logs</h3>
                <p className="text-sm text-gray-500">Review security activities</p>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};