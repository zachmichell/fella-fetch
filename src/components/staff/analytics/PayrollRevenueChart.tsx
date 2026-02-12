import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export const PayrollRevenueChart = () => {
  const queryClient = useQueryClient();
  const [payrollInput, setPayrollInput] = useState('');

  const { data: payrollSetting } = useQuery({
    queryKey: ['system-settings', 'weekly_payroll_cost'],
    queryFn: async () => {
      const { data } = await supabase.from('system_settings')
        .select('value')
        .eq('key', 'weekly_payroll_cost')
        .maybeSingle();
      return data?.value ? Number(data.value) : 0;
    },
  });

  const { data: revenueData } = useQuery({
    queryKey: ['analytics-revenue'],
    queryFn: async () => {
      const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      const start = format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd');

      const { data: session } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('analytics-revenue', {
        body: { startDate: start, endDate: end },
      });

      return response.data;
    },
  });

  const savePayroll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('system_settings').upsert({
        key: 'weekly_payroll_cost',
        value: parseFloat(payrollInput) as any,
        description: 'Weekly payroll cost for analytics',
      }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings', 'weekly_payroll_cost'] });
      toast.success('Payroll cost saved');
    },
  });

  const weeklyPayroll = payrollSetting || 0;
  const chartData = revenueData?.monthlyRevenue?.map((m: any) => ({
    month: m.month,
    Revenue: m.total,
    Payroll: weeklyPayroll * 4.33, // approximate monthly
  })) || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Payroll vs. Revenue</CardTitle>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Weekly payroll $"
            value={payrollInput}
            onChange={e => setPayrollInput(e.target.value)}
            className="h-8 w-[140px]"
          />
          <Button size="sm" variant="outline" className="h-8" onClick={() => savePayroll.mutate()} disabled={!payrollInput}>
            Save
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!chartData.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">No revenue data available. Ensure Shopify orders exist.</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
              <Legend />
              <Line type="monotone" dataKey="Revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
              <Line type="monotone" dataKey="Payroll" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
