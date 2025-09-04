import { GoogleGenAI, Type } from "@google/genai";
import { NewTransaction, Category } from '../types';
import { CATEGORIES } from '../constants';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const model = 'gemini-2.5-flash';

const billItemSchema = {
  type: Type.OBJECT,
  properties: {
    name: {
      type: Type.STRING,
      description: '账单上的商家、服务或商品名称（保持原文，无需翻译）。如果是转账，这里是收款人名称。',
    },
    location: {
      type: Type.STRING,
      description: '商家地址，如果账单上可见。',
    },
    date: {
      type: Type.STRING,
      description: '交易日期和时间，格式为 YYYY-MM-DDTHH:mm。',
    },
    amount: {
      type: Type.NUMBER,
      description: '该条目的总金额。',
    },
    category: {
      type: Type.STRING,
      description: `根据商家或商品信息将此条目分类。`,
      enum: CATEGORIES,
    },
  },
  required: ['name', 'date', 'amount', 'category'],
};

const billAnalysisSchema = {
    type: Type.ARRAY,
    items: billItemSchema
};


export const analyzeBillImage = async (
  base64Image: string,
  mimeType: string
): Promise<NewTransaction[]> => {
  try {
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    };

    const textPart = {
      text: `分析这份文件（可能是图片、PDF、CSV或文本文档），内容为中文或日文账单。请仅识别并提取所有的“支出”或“付款”交易条目，忽略任何收入、退款或存款记录。对于每一个支出条目：1. 提取商家、服务或商品名称（保持原文）。2. 如果名称中包含“に送る”，请将分类设为“转账”，并将“に送る”之前的部分作为收款人名称。3. 提取交易日期和时间 (YYYY-MM-DDTHH:mm) 和总金额。4. 提取商家地址（如果可见）。5. 根据信息从列表中选择最合适的分类。以JSON数组的形式返回结果，每个条目都是一个独立的对象。即使只有一个条目，也返回包含单个对象的数组。`,
    };

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: billAnalysisSchema,
      },
    });
    
    const jsonText = response.text.trim();
    const parsedData = JSON.parse(jsonText);

    // Validate the parsed data is an array
    if (!Array.isArray(parsedData)) {
      throw new Error('AI 返回的数据不是一个数组。');
    }

    const validTransactions: NewTransaction[] = [];
    for (const item of parsedData) {
        if (
            item.name &&
            item.date &&
            typeof item.amount === 'number' &&
            CATEGORIES.includes(item.category as Category)
        ) {
            validTransactions.push(item as NewTransaction);
        } else {
            console.warn('Skipping invalid item from AI:', item);
        }
    }

    if (validTransactions.length === 0 && parsedData.length > 0) {
        throw new Error('AI 返回的数据中没有有效的交易条目。');
    }
    
    return validTransactions;

  } catch (error) {
    console.error('Gemini API 调用失败:', error);
    if (error instanceof Error) {
        throw new Error(`无法分析账单: ${error.message}`);
    }
    throw new Error('分析账单时发生未知错误。');
  }
};