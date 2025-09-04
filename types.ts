export enum Category {
  Food = '餐饮',
  Transport = '交通',
  Shopping = '购物',
  Entertainment = '娱乐',
  Home = '居家',
  Medical = '医疗',
  Education = '教育',
  Transfer = '转账',
  Other = '其他',
}

export interface Transaction {
  id: string;
  name: string;
  category: Category;
  amount: number;
  date: string; // YYYY-MM-DDTHH:mm
  location?: string;
}

export type NewTransaction = Omit<Transaction, 'id'>;

export interface DeletedItem {
  tx: Transaction;
  deletedAt: string; // ISO timestamp
}