/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

let aiInstance = null;

/**
 * Khởi tạo client Gemini API một cách trì hoãn (lazy initialization)
 * để tránh gây crash server khi chưa cài đặt API Key.
 */
export function getGeminiClient() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      console.warn("CẢNH BÁO: GEMINI_API_KEY chưa được thiết lập hoặc sử dụng key mặc định. Một số tính năng AI có thể không hoạt động.");
      return null;
    }
    
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

/**
 * Thực hiện gọi Gemini API với cơ chế tự động thử lại (retry) khi gặp lỗi 503 hoặc quá tải
 * và tự động chuyển sang model dự phòng (gemini-3.1-flash-lite) nếu cần thiết.
 */
export async function generateWithRetry(params, maxRetries = 3, initialDelay = 1000) {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('Tính năng AI chưa được cấu hình. Vui lòng thiết lập API Key.');
  }

  let lastError = null;
  let delay = initialDelay;
  
  const requestedModel = params.model || 'gemini-3.5-flash';
  const modelsToTry = [requestedModel];
  
  // Nếu model chính là gemini-3.5-flash, sử dụng thêm gemini-3.1-flash-lite làm dự phòng khi quá tải
  if (requestedModel === 'gemini-3.5-flash') {
    modelsToTry.push('gemini-3.1-flash-lite');
  }

  for (const currentModel of modelsToTry) {
    const currentParams = { ...params, model: currentModel };
    delay = initialDelay;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`[AI] Đang gọi model ${currentModel} (Lần thử ${i + 1}/${maxRetries})...`);
        const response = await ai.models.generateContent(currentParams);
        return response;
      } catch (err) {
        lastError = err;
        const errStr = err.message || (err.toString ? err.toString() : '') || '';
        const isRetryable = 
          err.status === 503 || 
          err.status === 429 || 
          errStr.includes("503") || 
          errStr.includes("429") || 
          errStr.includes("UNAVAILABLE") || 
          errStr.includes("Resource has been exhausted") || 
          errStr.includes("high demand") || 
          errStr.includes("temporary") ||
          errStr.includes("overloaded") ||
          errStr.includes("busy");
          
        if (isRetryable && i < maxRetries - 1) {
          console.warn(`[AI] Model ${currentModel} lỗi (${errStr.slice(0, 100)}). Thử lại sau ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          console.warn(`[AI] Model ${currentModel} thất bại vĩnh viễn hoặc hết số lần thử. Lỗi: ${errStr.slice(0, 150)}`);
          break; // Thoát vòng lặp retry, chuyển sang model dự phòng tiếp theo
        }
      }
    }
  }

  throw lastError || new Error('Không thể kết nối tới dịch vụ AI.');
}

