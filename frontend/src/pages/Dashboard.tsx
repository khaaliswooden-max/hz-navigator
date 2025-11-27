import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const statsData = [
  { label: 'Active HUBZones', value: '8,247', change: '+2.3%', positive: true },
  { label: 'Certified Businesses', value: '23,841', change: '+5.1%', positive: true },
  { label: 'Pending Reviews', value: '1,432', change: '-12%', positive: true },
  { label: 'Avg. Processing Time', value: '18 days', change: '-3 days', positive: true },
];

const chartData = [
  { name: 'Jan', applications: 245, approved: 198 },
  { name: 'Feb', applications: 312, approved: 267 },
  { name: 'Mar', applications: 289, approved: 245 },
  { name: 'Apr', applications: 367, approved: 312 },
  { name: 'May', applications: 423, approved: 378 },
  { name: 'Jun', applications: 398, approved: 356 },
];

const zoneTypeData = [
  { name: 'Qualified Census Tract', value: 4521, color: '#0073c7' },
  { name: 'Non-Metro County', value: 2134, color: '#36acf8' },
  { name: 'Indian Lands', value: 876, color: '#7cc8fc' },
  { name: 'Base Closure', value: 432, color: '#bae0fd' },
  { name: 'Governor Designated', value: 284, color: '#e0effe' },
];

function Dashboard() {
  return (
    <div className="space-y-8 animate-in">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-display text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Overview of HUBZone certification activity and statistics
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat) => (
          <div key={stat.label} className="card">
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <span
                className={`text-sm font-medium ${
                  stat.positive ? 'text-verified-600' : 'text-red-600'
                }`}
              >
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar chart */}
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Application Trends
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar
                  dataKey="applications"
                  fill="#bae0fd"
                  name="Applications"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="approved"
                  fill="#0073c7"
                  name="Approved"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie chart */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Zone Types
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={zoneTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {zoneTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {zoneTypeData.slice(0, 3).map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-600">{item.name}</span>
                <span className="ml-auto font-medium text-gray-900">
                  {item.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card bg-gradient-to-r from-hubzone-600 to-hubzone-700 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-semibold">Ready to check your address?</h2>
            <p className="mt-1 text-hubzone-100">
              Find out if your business location qualifies for HUBZone certification
            </p>
          </div>
          <a
            href="/check"
            className="btn bg-white text-hubzone-700 hover:bg-hubzone-50 whitespace-nowrap"
          >
            Check HUBZone Status →
          </a>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

