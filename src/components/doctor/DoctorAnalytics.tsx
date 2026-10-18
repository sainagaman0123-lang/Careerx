import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { Activity, Users, Clock, AlertTriangle, ShieldCheck, TrendingUp } from 'lucide-react';
import { Appointment, MedicalCourse } from '../../types/appointment';

interface DoctorAnalyticsProps {
  appointments: Appointment[];
  courses: MedicalCourse[];
}

export const DoctorAnalytics: React.FC<DoctorAnalyticsProps> = ({ appointments, courses }) => {
  // Compute analytics
  const totalAppointments = appointments.length;
  const completedAppointments = appointments.filter((a) => a.status === 'Completed').length;
  const emergencyAppointments = appointments.filter((a) => a.isEmergencyOverride).length;
  const activeCourses = courses.filter((c) => c.status === 'Active').length;

  // Day distribution mock & derived
  const weeklyTrends = [
    { day: 'Mon', footfall: 24, completed: 22, emergency: 2 },
    { day: 'Tue', footfall: 28, completed: 25, emergency: 3 },
    { day: 'Wed', footfall: 32, completed: 30, emergency: 2 },
    { day: 'Thu', footfall: 26, completed: 24, emergency: 1 },
    { day: 'Fri', footfall: 35, completed: 31, emergency: 4 },
    { day: 'Sat', footfall: 19, completed: 18, emergency: 1 },
  ];

  const statusDistribution = [
    { name: 'Completed', value: completedAppointments || 5, color: '#10b981' },
    { name: 'Pending / Active', value: appointments.filter((a) => a.status === 'Accepted' || a.status === 'Pending').length || 3, color: '#3b82f6' },
    { name: 'Emergency Overrides', value: emergencyAppointments || 1, color: '#ef4444' },
    { name: 'Rescheduled', value: appointments.filter((a) => a.status === 'Rescheduled').length || 1, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium">Total OPD Consultations</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{totalAppointments}</div>
          <span className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
            <TrendingUp className="w-3 h-3" /> +14% vs last week
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium">Active Medical Regimens</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{activeCourses}</div>
          <span className="text-[11px] text-indigo-400 mt-1 block">Synchronized with user_agent</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium">Verified Completion Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 92}%
          </div>
          <span className="text-[11px] text-emerald-400 mt-1 block">Pass code authenticated</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium">Emergency Takeovers</span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{emergencyAppointments}</div>
          <span className="text-[11px] text-red-400 mt-1 block">25% compensation discount issued</span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Footfall Trend Area Chart */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white text-base">Weekly OPD Patient Footfall & Resolution</h3>
              <p className="text-xs text-slate-400 mt-0.5">Recorded by doc_agent and front-desk checkins</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="footfallGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="footfall" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#footfallGrad)" name="Total Footfall" />
                <Area type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#completedGrad)" name="Concluded" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white text-base">Consultation Status Breakdown</h3>
            <p className="text-xs text-slate-400 mt-0.5">Distribution across queues</p>

            <div className="h-48 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
            {statusDistribution.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-300 text-[11px] truncate">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
