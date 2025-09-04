import { Category } from './types';

export const CATEGORIES: Category[] = [
  Category.Food,
  Category.Transport,
  Category.Shopping,
  Category.Entertainment,
  Category.Home,
  Category.Medical,
  Category.Transfer,
  Category.Other,
];

export const CATEGORY_COLORS: { [key in Category]: string } = {
  [Category.Food]: '#FB923C',      // Orange 400
  [Category.Transport]: '#60A5FA', // Blue 400
  [Category.Shopping]: '#F472B6',  // Pink 400
  [Category.Entertainment]: '#C084FC', // Purple 400
  [Category.Home]: '#FBBF24',      // Amber 400
  [Category.Medical]: '#34D399',    // Emerald 400
  [Category.Transfer]: '#2DD4BF',  // Teal 400
  [Category.Other]: '#9CA3AF',     // Gray 400
};