export class FormulaBuilder {
  static sum(range: string): string {
    return `SUM(${range})`;
  }

  static average(range: string): string {
    return `AVERAGE(${range})`;
  }

  static count(range: string): string {
    return `COUNT(${range})`;
  }

  static countIf(range: string, criteria: string): string {
    return `COUNTIF(${range},"${criteria}")`;
  }

  static sumIf(range: string, criteria: string, sumRange?: string): string {
    if (sumRange) {
      return `SUMIF(${range},"${criteria}",${sumRange})`;
    }
    return `SUMIF(${range},"${criteria}")`;
  }

  static vlookup(lookupValue: string, tableRange: string, colIndex: number, exactMatch: boolean = true): string {
    return `VLOOKUP(${lookupValue},${tableRange},${colIndex},${exactMatch ? 'FALSE' : 'TRUE'})`;
  }

  static ifFormula(condition: string, valueIfTrue: string, valueIfFalse: string): string {
    return `IF(${condition},"${valueIfTrue}","${valueIfFalse}")`;
  }

  static concat(...values: string[]): string {
    return `CONCATENATE(${values.join(',')})`;
  }
}
