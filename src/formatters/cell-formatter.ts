export class CellFormatter {
  getDefaultFormat(type: string): string {
    const formats: Record<string, string> = {
      text: '@',
      number: '#,##0',
      currency: '#,##0₫',
      percentage: '0.00%',
      date: 'dd/mm/yyyy',
      datetime: 'dd/mm/yyyy hh:mm:ss',
      boolean: 'General',
    };

    return formats[type] || 'General';
  }

  formatCurrency(value: number, symbol: string = '₫'): string {
    return `${value.toLocaleString()}${symbol}`;
  }

  formatPercentage(value: number): string {
    return `${(value * 100).toFixed(2)}%`;
  }

  formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('vi-VN');
  }
}
