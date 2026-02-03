import { Card } from '@/components/ui/card';
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
  Legend
} from 'recharts';

interface Order {
  id: string;
  total: number;
  status: string;
  created_at: string;
  order_items?: Array<{ product_name: string; price: number; quantity: number }>;
}

interface StatsChartsProps {
  orders: Order[];
}

export const StatsCharts = ({ orders }: StatsChartsProps) => {
  // Prepare data for sales by day (last 7 days)
  const salesByDay = () => {
    const days: Record<string, number> = {};
    const today = new Date();
    
    // Initialize last 7 days with 0
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const key = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      days[key] = 0;
    }

    // Sum up completed/paid orders
    orders
      .filter(o => o.status === 'completed' || o.status === 'paid')
      .forEach(order => {
        const date = new Date(order.created_at);
        const key = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        if (key in days) {
          days[key] += parseFloat(String(order.total));
        }
      });

    return Object.entries(days).map(([date, amount]) => ({
      date,
      amount,
    }));
  };

  // Prepare data for orders by status
  const ordersByStatus = () => {
    const statuses: Record<string, number> = {
      'Ожидает': 0,
      'Оплачен': 0,
      'Выполнен': 0,
      'Отменён': 0,
      'Возврат': 0,
    };

    orders.forEach(order => {
      switch (order.status) {
        case 'pending':
          statuses['Ожидает']++;
          break;
        case 'paid':
          statuses['Оплачен']++;
          break;
        case 'completed':
          statuses['Выполнен']++;
          break;
        case 'cancelled':
          statuses['Отменён']++;
          break;
        case 'refunded':
          statuses['Возврат']++;
          break;
      }
    });

    return Object.entries(statuses)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  };

  // Top products by sales
  const topProducts = () => {
    const products: Record<string, { name: string; revenue: number; count: number }> = {};

    orders
      .filter(o => o.status === 'completed' || o.status === 'paid')
      .forEach(order => {
        order.order_items?.forEach(item => {
          if (!products[item.product_name]) {
            products[item.product_name] = { name: item.product_name, revenue: 0, count: 0 };
          }
          products[item.product_name].revenue += parseFloat(String(item.price)) * (item.quantity || 1);
          products[item.product_name].count += item.quantity || 1;
        });
      });

    return Object.values(products)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  const salesData = salesByDay();
  const statusData = ordersByStatus();
  const topProductsData = topProducts();

  return (
    <div className="space-y-6">
      {/* Sales by Day */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Продажи за неделю</h3>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                tickFormatter={(value) => `${value}₽`}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toLocaleString('ru-RU')} ₽`, 'Выручка']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar 
                dataKey="amount" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Orders by Status */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Статусы заказов</h3>
          {statusData.length > 0 ? (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend 
                    layout="vertical" 
                    align="right" 
                    verticalAlign="middle"
                    formatter={(value) => <span className="text-sm">{value}</span>}
                  />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Нет данных о заказах
            </div>
          )}
        </Card>

        {/* Top Products */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Топ товаров</h3>
          {topProductsData.length > 0 ? (
            <div className="space-y-3">
              {topProductsData.map((product, index) => (
                <div key={product.name} className="flex items-center gap-3">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: COLORS[index % COLORS.length], color: 'white' }}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.count} шт · {product.revenue.toLocaleString('ru-RU')} ₽
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-muted-foreground">
              Нет данных о продажах
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
