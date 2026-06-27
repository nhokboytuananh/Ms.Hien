/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import multer from "multer";
import * as xlsx from "xlsx";
import db from "../db/index.js";
import { requireAuth, requireTeacher } from "../middleware/auth.js";
import { getGeminiClient, generateWithRetry } from "../lib/gemini.js";
import { Type } from "@google/genai";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @route GET /api/vocabulary
 * @desc Lấy danh sách từ vựng có lọc theo lớp (grade), bài học (unit), chủ đề (topic) hoặc tìm kiếm (q)
 */
router.get("/vocabulary", requireAuth, async (req, res) => {
  const { grade, unit, topic, q } = req.query;

  try {
    // 1. Lấy toàn bộ từ vựng từ database
    const result = await db.query("SELECT * FROM vocabulary ORDER BY word ASC");
    let words = result.rows;

    // 2. Thực hiện bộ lọc bằng Javascript trong bộ nhớ để đạt hiệu năng cao và đồng nhất cả môi trường Local & Postgres
    if (grade) {
      words = words.filter((w) => w.grade === Number(grade));
    }

    if (unit) {
      words = words.filter(
        (w) => w.unit && w.unit.toLowerCase().includes(unit.toLowerCase()),
      );
    }

    if (topic) {
      words = words.filter(
        (w) => w.topic && w.topic.toLowerCase().includes(topic.toLowerCase()),
      );
    }

    if (q) {
      const searchStr = q.toLowerCase();
      words = words.filter(
        (w) =>
          w.word.toLowerCase().includes(searchStr) ||
          (w.meaning_vi && w.meaning_vi.toLowerCase().includes(searchStr)),
      );
    }

    res.json(words);
  } catch (error) {
    console.error("Lỗi khi tải từ vựng:", error);
    res.status(500).json({ error: "Không thể tải danh sách từ vựng." });
  }
});

/**
 * @route POST /api/vocabulary
 * @desc Thêm từ vựng mới (Chỉ dành cho Giáo viên)
 */
router.post("/vocabulary", requireAuth, requireTeacher, async (req, res) => {
  const { word, ipa, word_type, meaning_vi, example, topic, grade, unit } =
    req.body;

  if (!word || !meaning_vi) {
    return res
      .status(400)
      .json({ error: "Từ tiếng Anh và Nghĩa tiếng Việt là bắt buộc." });
  }

  try {
    const creatorId = req.user.id;
    const result = await db.query(
      "INSERT INTO vocabulary (word, ipa, word_type, meaning_vi, example, topic, grade, unit, created_by) " +
        "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
      [
        word,
        ipa || "",
        word_type || "n",
        meaning_vi,
        example || "",
        topic || "Chung",
        grade ? Number(grade) : null,
        unit || null,
        creatorId,
      ],
    );

    res.status(201).json({
      message: "Thêm từ vựng thành công!",
      vocabulary: result.rows[0],
    });
  } catch (error) {
    console.error("Lỗi khi thêm từ vựng:", error);
    res.status(500).json({ error: "Không thể thêm từ vựng mới." });
  }
});

/**
 * @route PUT /api/vocabulary/:id
 * @desc Sửa đổi thông tin từ vựng (Chỉ dành cho Giáo viên)
 */
router.put("/vocabulary/:id", requireAuth, requireTeacher, async (req, res) => {
  const { id } = req.params;
  const { word, ipa, word_type, meaning_vi, example, topic, grade, unit } =
    req.body;

  if (!word || !meaning_vi) {
    return res
      .status(400)
      .json({ error: "Từ tiếng Anh và Nghĩa tiếng Việt là bắt buộc." });
  }

  try {
    const result = await db.query(
      "UPDATE vocabulary SET word = $1, ipa = $2, word_type = $3, meaning_vi = $4, example = $5, topic = $6, grade = $7, unit = $8 " +
        "WHERE id = $9 RETURNING *",
      [
        word,
        ipa || "",
        word_type || "n",
        meaning_vi,
        example || "",
        topic || "Chung",
        grade ? Number(grade) : null,
        unit || null,
        Number(id),
      ],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy từ vựng yêu cầu sửa." });
    }

    res.json({
      message: "Cập nhật từ vựng thành công!",
      vocabulary: result.rows[0],
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật từ vựng:", error);
    res.status(500).json({ error: "Không thể sửa đổi thông tin từ vựng." });
  }
});

/**
 * @route DELETE /api/vocabulary/:id
 * @desc Xóa từ vựng khỏi hệ thống (Chỉ dành cho Giáo viên)
 */
router.delete(
  "/vocabulary/:id",
  requireAuth,
  requireTeacher,
  async (req, res) => {
    const { id } = req.params;

    try {
      const result = await db.query("DELETE FROM vocabulary WHERE id = $1", [
        Number(id),
      ]);

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Từ vựng không tồn tại." });
      }

      res.json({ message: "Đã xóa từ vựng khỏi danh sách thành công!" });
    } catch (error) {
      console.error("Lỗi khi xóa từ vựng:", error);
      res.status(500).json({ error: "Không thể xóa từ vựng." });
    }
  },
);

/**
 * @route POST /api/vocabulary/ai-generate
 * @desc Tự động sinh 5 từ vựng theo khối lớp bằng AI
 */
router.post(
  "/vocabulary/ai-generate",
  requireAuth,
  requireTeacher,
  async (req, res) => {
    const { grade } = req.body;
    if (!grade) {
      return res.status(400).json({ error: "Vui lòng chọn khối lớp." });
    }

    try {
      const aiClient = getGeminiClient();
      if (!aiClient) {
        return res
          .status(500)
          .json({
            error: "AI Client chưa được cấu hình (Thiếu GEMINI_API_KEY).",
          });
      }

      const vocabSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING, description: "Từ vựng tiếng Anh" },
            pronunciation: { type: Type.STRING, description: "Phát âm IPA" },
            meaning_vi: { type: Type.STRING, description: "Nghĩa tiếng Việt" },
            example_en: { type: Type.STRING, description: "Ví dụ tiếng Anh" },
            example_vi: { type: Type.STRING, description: "Dịch nghĩa ví dụ" },
          },
          required: ["word", "meaning_vi"],
        },
      };

      const prompt = `Sinh ngẫu nhiên 5 từ vựng tiếng Anh trình độ trung học phổ thông khối ${grade}. Đảm bảo các từ vựng này phổ biến và bám sát chương trình học khối ${grade}.
    Hãy cung cấp từ, phát âm IPA, nghĩa tiếng việt, câu ví dụ và dịch nghĩa của ví dụ.`;

      const response = await generateWithRetry({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: vocabSchema
        }
      });
      
      const resultText = response.text;
      const result = JSON.parse(resultText);

      let count = 0;
      for (const v of result) {
        const exampleText = v.example_en ? `${v.example_en} (${v.example_vi || ''})` : "";
        await db.query(
          `INSERT INTO vocabulary 
         (word, ipa, meaning_vi, example, grade, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            v.word || "",
            v.pronunciation || "",
            v.meaning_vi || "",
            exampleText,
            Number(grade),
            req.user.id,
          ],
        );
        count++;
      }

      res.json({ message: "Tạo thành công", count });
    } catch (error) {
      console.error("Lỗi khi sinh từ vựng bằng AI:", error);
      res.status(500).json({ error: "Lỗi AI: " + error.message });
    }
  },
);

/**
 * @route POST /api/vocabulary/import-excel
 * @desc Nhập từ vựng từ file Excel
 */
router.post(
  "/vocabulary/import-excel",
  requireAuth,
  requireTeacher,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Không tìm thấy file tải lên." });
    }

    try {
      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet);

      if (!data || data.length === 0) {
        return res
          .status(400)
          .json({ error: "File Excel trống hoặc không đúng định dạng." });
      }

      let count = 0;
      for (const row of data) {
        // row keys có thể phụ thuộc vào file Excel, ta mong đợi: Word, Pronunciation, Meaning, Example, Grade
        // Chuẩn hóa keys:
        const getVal = (possibleKeys) => {
          for (const k of possibleKeys) {
            if (row[k] !== undefined) return row[k];
          }
          return "";
        };

        const word = getVal(["Word", "Từ vựng", "Tu vung", "word"]);
        if (!word) continue;

        const pronunciation = getVal([
          "Pronunciation",
          "Phát âm",
          "Phat am",
          "pronunciation",
        ]);
        const meaning_vi = getVal([
          "Meaning",
          "Nghĩa tiếng Việt",
          "Nghia",
          "meaning_vi",
          "meaning",
        ]);
        const example_en = getVal([
          "Example",
          "Ví dụ tiếng Anh",
          "Vi du",
          "example_en",
          "example",
        ]);
        const gradeRaw = getVal(["Grade", "Khối", "Khoi", "Lớp", "grade"]);

        let grade = 10;
        if (gradeRaw && !isNaN(Number(gradeRaw))) {
          grade = Number(gradeRaw);
        }

        await db.query(
          `INSERT INTO vocabulary 
         (word, ipa, meaning_vi, example, grade, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
          [word, pronunciation, meaning_vi, example_en, grade, req.user.id],
        );
        count++;
      }

      res.json({ message: "Nhập thành công", count });
    } catch (error) {
      console.error("Lỗi khi nhập Excel:", error);
      res.status(500).json({ error: "Lỗi khi nhập dữ liệu: " + error.message });
    }
  },
);

export default router;
