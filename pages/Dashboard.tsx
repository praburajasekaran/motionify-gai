import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, Badge, cn } from '../components/ui/design-system';
import { MOCK_PROJECTS } from '../constants';
import { Clock, CheckCircle2, AlertCircle, PlayCircle, ArrowUpRight, TrendingUp, Users } from 'lucide-react';

const StatCard = ({ title, value, change, icon: Icon, trend, delay }: { title: string, value: string, change: string, icon: any, trend: 'up' | 'down' | 'neutral', delay: string }) => (
  <Card hoverable className={cn("bg-white border-zinc-200 animate-fade-in-up", delay)}>
    <CardContent className="p-6">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="p-2.5 bg-white rounded-full ring-1 ring-inset ring-zinc-100 shadow-sm">
            <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="flex flex-col gap-1 pt-4">
        <div className="text-3xl font-bold tracking-tight text-foreground">{value}</div>
        <div className={cn("text-xs font-medium flex items-center", 
            trend === 'up' ? "text-emerald-600" : trend === 'down' ? "text-red-600" : "text-zinc-500"
        )}>
          {trend === 'up' && <TrendingUp className="h-3 w-3 mr-1" />}
          {change}
        </div>
      </div>
    </CardContent>
  </Card>
);

const data = [
  { name: 'Mon', completed: 2, active: 4 },
  { name: 'Tue', completed: 1, active: 5 },
  { name: 'Wed', completed: 3, active: 6 },
  { name: 'Thu', completed: 4, active: 5 },
  { name: 'Fri', completed: 2, active: 8 },
  { name: 'Sat', completed: 1, active: 2 },
  { name: 'Sun', completed: 0, active: 1 },
];

export const Dashboard = () => {
  const activeProjects = MOCK_PROJECTS.filter(p => p.status === 'Active').length;
  const completedProjects = MOCK_PROJECTS.filter(p => p.status === 'Completed').length;

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-1 animate-fade-in">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Your Creative Command Center</h2>
        <p className="text-muted-foreground">Track your productions in motion and ship exceptional work.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="In Motion"
          value={activeProjects.toString()}
          change="+12% from last week"
          icon={PlayCircle}
          trend="up"
          delay="animation-delay-[100ms]"
        />
        <StatCard
          title="Shipped This Month"
          value={completedProjects.toString()}
          change="+4 vs last month"
          icon={CheckCircle2}
          trend="up"
          delay="animation-delay-[200ms]"
        />
        <StatCard
          title="Ready to Launch"
          value="3"
          change="-2 from yesterday"
          icon={Clock}
          trend="down"
          delay="animation-delay-[300ms]"
        />
        <StatCard
          title="Team Power"
          value="85%"
          change="High Utilization"
          icon={Users}
          trend="neutral"
          delay="animation-delay-[400ms]"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card hoverable className="md:col-span-4 border-zinc-200 animate-fade-in-up animation-delay-[500ms]">
          <CardHeader>
            <CardTitle>Your Week in Motion</CardTitle>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `${value}`} 
                  />
                  <Tooltip 
                    cursor={{stroke: 'hsl(var(--border))'}}
                    contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                        padding: '12px',
                        backgroundColor: 'white',
                        color: 'hsl(var(--popover-foreground))'
                    }}
                  />
                  <Area type="monotone" dataKey="active" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorActive)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card hoverable className="md:col-span-3 border-zinc-200 animate-fade-in-up animation-delay-[600ms]">
          <CardHeader>
            <CardTitle>What's Happening</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-4 group cursor-pointer p-3 rounded-xl hover:bg-zinc-50 transition-colors">
                  <div className="relative pt-0.5">
                      <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center ring-4 ring-white shadow-sm group-hover:scale-110 transition-transform duration-200">
                        <Users className="h-4 w-4 text-blue-500 transition-colors" />
                      </div>
                      {i === 1 && <span className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-blue-500 rounded-full ring-2 ring-white animate-pulse" />}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none text-foreground group-hover:text-primary transition-colors">
                      Sarah just dropped 3 new assets on <span className="font-bold">Nike Air Campaign</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                        2 hours ago
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};