/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

// Kiểm tra xem DATABASE_URL có được cấu hình không (Sử dụng trên Render.com)
const isProduction = !!process.env.DATABASE_URL;

let pool;

// Khai báo file lưu dữ liệu local khi chạy thử nghiệm
const DB_FILE_PATH = path.join(process.cwd(), 'db', 'local_db.json');

// Dữ liệu mẫu (Seed Data) dùng để khởi tạo cho môi trường local
const INITIAL_SEED_DATA = {
  users: [
    { id: 1, full_name: 'Ms. Hien', email: 'teacher', password_hash: '$2b$10$L9CIaPdQYjmXpTS35VcmWOxx1yCRBqYNiPYR1okQ5aJriYWtML5xu', role: 'teacher', class_name: null, created_at: new Date() },
    { id: 2, full_name: 'Nguyễn Văn An', email: 'hs1@10a1.com', password_hash: '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', role: 'student', class_name: '10A1', created_at: new Date() },
    { id: 3, full_name: 'Trần Thị Bình', email: 'hs2@10a1.com', password_hash: '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', role: 'student', class_name: '10A1', created_at: new Date() },
    { id: 4, full_name: 'Lê Hoàng Cường', email: 'hs3@10a1.com', password_hash: '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', role: 'student', class_name: '10A1', created_at: new Date() },
    { id: 5, full_name: 'Phạm Hồng Duy', email: 'hs4@10a1.com', password_hash: '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', role: 'student', class_name: '10A1', created_at: new Date() },
    { id: 6, full_name: 'Vũ Hải Yến', email: 'hs5@10a1.com', password_hash: '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', role: 'student', class_name: '10A1', created_at: new Date() },
    { id: 7, full_name: 'Hoàng Văn Dương', email: 'hs1@11b2.com', password_hash: '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', role: 'student', class_name: '11B2', created_at: new Date() },
    { id: 8, full_name: 'Nguyễn Thanh Hà', email: 'hs2@11b2.com', password_hash: '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', role: 'student', class_name: '11B2', created_at: new Date() },
    { id: 9, full_name: 'Trịnh Tiến Dũng', email: 'hs3@11b2.com', password_hash: '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', role: 'student', class_name: '11B2', created_at: new Date() },
    { id: 10, full_name: 'Phan Văn Đức', email: 'hs4@11b2.com', password_hash: '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', role: 'student', class_name: '11B2', created_at: new Date() },
    { id: 11, full_name: 'Đỗ Thùy Linh', email: 'hs5@11b2.com', password_hash: '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', role: 'student', class_name: '11B2', created_at: new Date() },
    { id: 12, full_name: 'Bùi Minh Quân', email: 'hs1@12c3.com', password_hash: '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', role: 'student', class_name: '12C3', created_at: new Date() },
    { id: 13, full_name: 'Vũ Thùy Trang', email: 'hs2@12c3.com', password_hash: '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', role: 'student', class_name: '12C3', created_at: new Date() },
    { id: 14, full_name: 'Đinh Gia Huy', email: 'hs3@12c3.com', password_hash: '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', role: 'student', class_name: '12C3', created_at: new Date() },
    { id: 15, full_name: 'Nguyễn Thị Hương', email: 'hs4@12c3.com', password_hash: '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', role: 'student', class_name: '12C3', created_at: new Date() },
    { id: 16, full_name: 'Lê Minh Triết', email: 'hs5@12c3.com', password_hash: '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', role: 'student', class_name: '12C3', created_at: new Date() }
  ],
  classes: [
    { id: 1, name: '10A1', teacher_id: 1, school_year: '2025-2026' },
    { id: 2, name: '11B2', teacher_id: 1, school_year: '2025-2026' },
    { id: 3, name: '12C3', teacher_id: 1, school_year: '2025-2026' }
  ],
  assignments: [
    { id: 1, title: 'Vocabulary Unit 1: Family Life', description: 'Học toàn bộ từ vựng Unit 1 và viết 5 câu ví dụ sử dụng các từ mới.', skill: 'Vocabulary', class_id: 1, teacher_id: 1, deadline: '2026-07-10T23:59:59.000Z', status: 'open', created_at: new Date() },
    { id: 2, title: 'Grammar: Present Simple vs Present Continuous', description: 'Hoàn thành các bài tập chia động từ trong file đính kèm.', skill: 'Grammar', class_id: 1, teacher_id: 1, deadline: '2026-07-15T23:59:59.000Z', status: 'open', created_at: new Date() },
    { id: 3, title: 'Reading Comprehension: Global Warming', description: 'Đọc đoạn văn và trả lời 10 câu hỏi trắc nghiệm.', skill: 'Reading', class_id: 2, teacher_id: 1, deadline: '2026-07-08T23:59:59.000Z', status: 'open', created_at: new Date() },
    { id: 4, title: 'Writing: Essay on Technology benefits', description: 'Viết một bài luận ngắn (150-200 từ) nói về lợi ích của điện thoại thông minh.', skill: 'Writing', class_id: 3, teacher_id: 1, deadline: '2026-07-05T23:59:59.000Z', status: 'open', created_at: new Date() }
  ],
  scores: [
    { id: 1, student_id: 2, assignment_id: 1, score: 9.0, note: 'Bài làm rất tốt, đầy đủ ví dụ!', graded_by: 1, graded_at: new Date() },
    { id: 2, student_id: 3, assignment_id: 1, score: 8.5, note: 'Nộp bài đúng hạn, cần chú ý ngữ pháp.', graded_by: 1, graded_at: new Date() },
    { id: 3, student_id: 4, assignment_id: 1, score: 7.0, note: 'Thiếu 2 câu ví dụ.', graded_by: 1, graded_at: new Date() },
    { id: 4, student_id: 7, assignment_id: 3, score: 9.5, note: 'Excellent reading comprehension skills!', graded_by: 1, graded_at: new Date() },
    { id: 5, student_id: 8, assignment_id: 3, score: 6.5, note: 'Cần cố gắng nhiều hơn ở phần suy luận ý kiến.', graded_by: 1, graded_at: new Date() }
  ],
  vocabulary: [
    { id: 1, word: 'homemaker', ipa: '/ˈhəʊmmeɪkə(r)/', word_type: 'n', meaning_vi: 'Người nội trợ', example: 'My mother is a homemaker and takes care of our family.', topic: 'Family Life', grade: 10, unit: 'Unit 1 Family Life', created_by: 1, created_at: new Date() },
    { id: 2, word: 'breadwinner', ipa: '/ˈbredwɪnə(r)/', word_type: 'n', meaning_vi: 'Trụ cột gia đình', example: 'In many families, both husband and wife are breadwinners.', topic: 'Family Life', grade: 10, unit: 'Unit 1 Family Life', created_by: 1, created_at: new Date() },
    { id: 3, word: 'chore', ipa: '/tʃɔː(r)/', word_type: 'n', meaning_vi: 'Công việc vặt (trong nhà)', example: 'We divide the household chores equally in our family.', topic: 'Family Life', grade: 10, unit: 'Unit 1 Family Life', created_by: 1, created_at: new Date() },
    { id: 4, word: 'heavy lifting', ipa: '/ˌhevi ˈlɪftɪŋ/', word_type: 'n', meaning_vi: 'Việc nặng nhọc', example: 'My brother always does the heavy lifting around the house.', topic: 'Family Life', grade: 10, unit: 'Unit 1 Family Life', created_by: 1, created_at: new Date() },
    { id: 5, word: 'household', ipa: '/ˈhaʊshəʊld/', word_type: 'n', meaning_vi: 'Hộ gia đình', example: 'They are in charge of household finances.', topic: 'Family Life', grade: 10, unit: 'Unit 1 Family Life', created_by: 1, created_at: new Date() },
    { id: 6, word: 'rubbish', ipa: '/ˈrʌbɪʃ/', word_type: 'n', meaning_vi: 'Rác thải', example: 'My duty is to take out the rubbish every evening.', topic: 'Family Life', grade: 10, unit: 'Unit 1 Family Life', created_by: 1, created_at: new Date() },
    { id: 7, word: 'divide', ipa: '/dɪˈvaɪd/', word_type: 'v', meaning_vi: 'Chia sẻ, phân chia', example: 'We divide the house chores based on our school schedule.', topic: 'Family Life', grade: 10, unit: 'Unit 1 Family Life', created_by: 1, created_at: new Date() },
    { id: 8, word: 'nurture', ipa: '/ˈnɜːtʃə(r)/', word_type: 'v', meaning_vi: 'Nuôi dưỡng', example: 'Mothers play an important role in nurturing children.', topic: 'Family Life', grade: 10, unit: 'Unit 1 Family Life', created_by: 1, created_at: new Date() },
    { id: 9, word: 'gratitude', ipa: '/ˈɡrætɪtjuːd/', word_type: 'n', meaning_vi: 'Lòng biết ơn', example: 'We should express our gratitude to our parents.', topic: 'Family Life', grade: 10, unit: 'Unit 1 Family Life', created_by: 1, created_at: new Date() },
    { id: 10, word: 'bond', ipa: '/bɒnd/', word_type: 'n', meaning_vi: 'Sự gắn kết', example: 'Eating dinners together helps strengthen the family bond.', topic: 'Family Life', grade: 10, unit: 'Unit 1 Family Life', created_by: 1, created_at: new Date() },
    { id: 11, word: 'benefit', ipa: '/ˈbenɪfɪt/', word_type: 'n', meaning_vi: 'Lợi ích', example: 'There are many benefits to sharing household chores.', topic: 'Family Life', grade: 10, unit: 'Unit 1 Family Life', created_by: 1, created_at: new Date() },
    { id: 12, word: 'contribute', ipa: '/kənˈtrɪbjuːt/', word_type: 'v', meaning_vi: 'Đóng góp', example: 'Each member contributes to making the house clean.', topic: 'Family Life', grade: 10, unit: 'Unit 1 Family Life', created_by: 1, created_at: new Date() },
    { id: 13, word: 'eco-friendly', ipa: '/ˌiːkəʊ ˈfrendli/', word_type: 'adj', meaning_vi: 'Thân thiện với môi trường', example: 'We should use eco-friendly products to protect our planet.', topic: 'Environment', grade: 10, unit: 'Unit 2 Humans and the Environment', created_by: 1, created_at: new Date() },
    { id: 14, word: 'carbon footprint', ipa: '/ˌkɑːbən ˈfʊtprɪnt/', word_type: 'n', meaning_vi: 'Dấu chân carbon', example: 'Riding a bicycle instead of driving helps reduce your carbon footprint.', topic: 'Environment', grade: 10, unit: 'Unit 2 Humans and the Environment', created_by: 1, created_at: new Date() },
    { id: 15, word: 'organic', ipa: '/ɔːˈɡænɪk/', word_type: 'adj', meaning_vi: 'Hữu cơ', example: 'Organic food is healthy and good for the environment.', topic: 'Environment', grade: 10, unit: 'Unit 2 Humans and the Environment', created_by: 1, created_at: new Date() },
    { id: 16, word: 'renewable', ipa: '/rɪˈnjuːəbl/', word_type: 'adj', meaning_vi: 'Có thể tái tạo', example: 'Solar and wind energy are sources of renewable energy.', topic: 'Environment', grade: 10, unit: 'Unit 2 Humans and the Environment', created_by: 1, created_at: new Date() },
    { id: 17, word: 'appliances', ipa: '/əˈplaɪənsɪz/', word_type: 'n', meaning_vi: 'Thiết bị điện gia dụng', example: 'Remember to turn off all electrical appliances before leaving.', topic: 'Environment', grade: 10, unit: 'Unit 2 Humans and the Environment', created_by: 1, created_at: new Date() },
    { id: 18, word: 'litter', ipa: '/ˈlɪtə(r)/', word_type: 'v/n', meaning_vi: 'Xả rác / Rác thải', example: 'Please do not litter in public parks.', topic: 'Environment', grade: 10, unit: 'Unit 2 Humans and the Environment', created_by: 1, created_at: new Date() },
    { id: 19, word: 'protect', ipa: '/prəˈtekt/', word_type: 'v', meaning_vi: 'Bảo vệ', example: 'Governments must act to protect endangered species.', topic: 'Environment', grade: 10, unit: 'Unit 2 Humans and the Environment', created_by: 1, created_at: new Date() },
    { id: 20, word: 'conserve', ipa: '/kənˈsɜːv/', word_type: 'v', meaning_vi: 'Bảo tồn, tiết kiệm', example: 'We need to conserve fresh water resources.', topic: 'Environment', grade: 10, unit: 'Unit 2 Humans and the Environment', created_by: 1, created_at: new Date() },
    { id: 21, word: 'pollute', ipa: '/pəˈluːt/', word_type: 'v', meaning_vi: 'Gây ô nhiễm', example: 'Chemical waste from factories pollutes local rivers.', topic: 'Environment', grade: 10, unit: 'Unit 2 Humans and the Environment', created_by: 1, created_at: new Date() },
    { id: 22, word: 'clean-up', ipa: '/ˈkliːn ʌp/', word_type: 'n', meaning_vi: 'Hoạt động dọn dẹp', example: 'Our class took part in a beach clean-up campaign last Sunday.', topic: 'Environment', grade: 10, unit: 'Unit 2 Humans and the Environment', created_by: 1, created_at: new Date() },
    { id: 23, word: 'sustainable', ipa: '/səˈsteɪnəbl/', word_type: 'adj', meaning_vi: 'Bền vững', example: 'We need sustainable solutions to economic growth.', topic: 'Environment', grade: 10, unit: 'Unit 2 Humans and the Environment', created_by: 1, created_at: new Date() },
    { id: 24, word: 'recycle', ipa: '/ˌriːˈsaɪkl/', word_type: 'v', meaning_vi: 'Tái chế', example: 'Paper, plastic and glass can be recycled easily.', topic: 'Environment', grade: 10, unit: 'Unit 2 Humans and the Environment', created_by: 1, created_at: new Date() },
    { id: 25, word: 'generation gap', ipa: '/ˌdʒenəˈreɪʃn ɡæp/', word_type: 'n', meaning_vi: 'Khoảng cách thế hệ', example: 'A generation gap can cause misunderstandings between parents and kids.', topic: 'Relationships', grade: 11, unit: 'Unit 1 Generation Gap', created_by: 1, created_at: new Date() },
    { id: 26, word: 'independent', ipa: '/ˌɪndɪˈpendənt/', word_type: 'adj', meaning_vi: 'Độc lập, tự chủ', example: 'University students are encouraged to be more independent.', topic: 'Life Skills', grade: 11, unit: 'Unit 2 Independent Life', created_by: 1, created_at: new Date() },
    { id: 27, word: 'artificial intelligence', ipa: '/ˌɑːtɪfɪʃl ɪnˈtelɪdʒəns/', word_type: 'n', meaning_vi: 'Trí tuệ nhân tạo (AI)', example: 'Artificial intelligence is changing the way we learn and work.', topic: 'Technology', grade: 12, unit: 'Unit 1 AI Era', created_by: 1, created_at: new Date() },
    { id: 28, word: 'lifelong learning', ipa: '/ˈlaɪflɒŋ ˈlɜːnɪŋ/', word_type: 'n', meaning_vi: 'Học tập suốt đời', example: 'Lifelong learning is essential in a rapidly changing world.', topic: 'Education', grade: 12, unit: 'Unit 2 Lifelong Learning', created_by: 1, created_at: new Date() },
    { id: 29, word: 'biodiversity', ipa: '/ˌbaɪəʊdaɪˈvɜːsəti/', word_type: 'n', meaning_vi: 'Đa dạng sinh học', example: 'The tropical rainforest has an extremely rich biodiversity.', topic: 'Environment', grade: null, unit: null, created_by: 1, created_at: new Date() },
    { id: 30, word: 'deforestation', ipa: '/ˌdiːˌfɒrɪˈsteɪʃn/', word_type: 'n', meaning_vi: 'Sự phá rừng', example: 'Deforestation leads to global warming and loss of habitat.', topic: 'Environment', grade: null, unit: null, created_by: 1, created_at: new Date() },
    { id: 31, word: 'emission', ipa: '/iˈmɪʃn/', word_type: 'n', meaning_vi: 'Khí thải', example: 'The government aims to cut carbon emissions to zero by 2050.', topic: 'Environment', grade: null, unit: null, created_by: 1, created_at: new Date() },
    { id: 32, word: 'innovation', ipa: '/ˌɪnəˈveɪʃn/', word_type: 'n', meaning_vi: 'Sự đổi mới, sáng kiến', example: 'Technological innovation drives the modern economy.', topic: 'Technology', grade: null, unit: null, created_by: 1, created_at: new Date() },
    { id: 33, word: 'cyberspace', ipa: '/ˈsaɪbəspeɪs/', word_type: 'n', meaning_vi: 'Không gian mạng', example: 'Parents should monitor what their kids are doing in cyberspace.', topic: 'Technology', grade: null, unit: null, created_by: 1, created_at: new Date() },
    { id: 34, word: 'ubiquitous', ipa: '/juːˈbɪkwɪtəs/', word_type: 'adj', meaning_vi: 'Khắp mọi nơi, phổ biến', example: 'Mobile phones are ubiquitous in our daily lives.', topic: 'Technology', grade: null, unit: null, created_by: 1, created_at: new Date() },
    { id: 35, word: 'ancestor', ipa: '/ˈænsestə(r)/', word_type: 'n', meaning_vi: 'Tổ tiên', example: 'Our ancestors came to this land hundreds of years ago.', topic: 'Family', grade: null, unit: null, created_by: 1, created_at: new Date() },
    { id: 36, word: 'heritage', ipa: '/ˈherɪtɪdʒ/', word_type: 'n', meaning_vi: 'Di sản', example: 'We must preserve our traditional cultural heritage.', topic: 'Family', grade: null, unit: null, created_by: 1, created_at: new Date() },
    { id: 37, word: 'offspring', ipa: '/ˈɒfsprɪŋ/', word_type: 'n', meaning_vi: 'Con cái, hậu duệ', example: 'Parents work hard to provide a better life for their offspring.', topic: 'Family', grade: null, unit: null, created_by: 1, created_at: new Date() },
    { id: 38, word: 'hypothesis', ipa: '/haɪˈpɒθəsɪs/', word_type: 'n', meaning_vi: 'Giả thuyết', example: 'The researchers proposed a new hypothesis to explain the results.', topic: 'Science', grade: null, unit: null, created_by: 1, created_at: new Date() },
    { id: 39, word: 'laboratory', ipa: '/ləˈbɒrətri/', word_type: 'n', meaning_vi: 'Phòng thí nghiệm', example: 'Students love doing science experiments in the chemistry laboratory.', topic: 'Science', grade: null, unit: null, created_by: 1, created_at: new Date() },
    { id: 40, word: 'breakthrough', ipa: '/ˈbreɪkθruː/', word_type: 'n', meaning_vi: 'Sự đột phá', example: 'Scientists made a major breakthrough in cancer treatment.', topic: 'Science', grade: null, unit: null, created_by: 1, created_at: new Date() },
    { id: 41, word: 'nutrition', ipa: '/njuˈtrɪʃn/', word_type: 'n', meaning_vi: 'Dinh dưỡng', example: 'Good nutrition is essential for a healthy body and mind.', topic: 'Health', grade: null, unit: null, created_by: 1, created_at: new Date() },
    { id: 42, word: 'immune system', ipa: '/ɪˈmjuːn ˌsɪstəm/', word_type: 'n', meaning_vi: 'Hệ miễn dịch', example: 'Eating oranges can help boost your immune system.', topic: 'Health', grade: null, unit: null, created_by: 1, created_at: new Date() },
    { id: 43, word: 'sedentary', ipa: '/ˈsedntri/', word_type: 'adj', meaning_vi: 'Thụ động, ít vận động', example: 'A sedentary lifestyle can lead to various health issues.', topic: 'Health', grade: null, unit: null, created_by: 1, created_at: new Date() }
  ],
  exams: [
    { id: 1, title: 'Đề thi Tham khảo THPT Quốc Gia môn Tiếng Anh - 2024 (Rút Gọn)', exam_type: 'thpt_qg', year: 2024, province: 'Bộ Giáo Dục', grade: 12, duration_minutes: 60, difficulty: 'medium', is_ai_generated: false, created_by: 1, created_at: new Date() },
    { id: 2, title: 'Đề thi Học Sinh Giỏi cấp Trường môn Tiếng Anh lớp 11 - 2024 (Rút Gọn)', exam_type: 'hsg_truong', year: 2024, province: 'THPT Chu Văn An', grade: 11, duration_minutes: 45, difficulty: 'hard', is_ai_generated: false, created_by: 1, created_at: new Date() }
  ],
  exam_questions: [
    { id: 1, exam_id: 1, question_order: 1, part: 'Pronunciation', question_text: 'Choose the word whose underlined part differs from the other three in pronunciation:\n**A**. play__ed__  **B**. plann__ed__  **C**. decid__ed__  **D**. liv__ed__', option_a: 'played', option_b: 'planned', option_c: 'decided', option_d: 'lived', correct_answer: 'C', explanation: 'Đuôi -ed của "decided" phát âm là /ɪd/ vì tận cùng là "d". Ba từ còn lại phát âm là /d/.' },
    { id: 2, exam_id: 1, question_order: 2, part: 'Pronunciation', question_text: 'Choose the word whose underlined part differs from the other three in pronunciation:\n**A**. l__i__ght  **B**. f__i__ne  **C**. m__i__nd  **D**. f__i__t', option_a: 'light', option_b: 'fine', option_c: 'mind', option_d: 'fit', correct_answer: 'D', explanation: 'Từ "fit" có nguyên âm /ɪ/, ba từ còn lại có nguyên âm đôi /aɪ/.' },
    { id: 3, exam_id: 1, question_order: 3, part: 'Stress', question_text: 'Choose the word that differs from the other three in the position of primary stress:\n**A**. teacher  **B**. student  **C**. explore  **D**. table', option_a: 'teacher', option_b: 'student', option_c: 'explore', option_d: 'table', correct_answer: 'C', explanation: 'Từ "explore" có trọng âm rơi vào âm tiết thứ 2. Ba từ còn lại có trọng âm rơi vào âm tiết thứ nhất.' },
    { id: 4, exam_id: 1, question_order: 4, part: 'Stress', question_text: 'Choose the word that differs from the other three in the position of primary stress:\n**A**. domestic  **B**. beautiful  **C**. family  **D**. physical', option_a: 'domestic', option_b: 'beautiful', option_c: 'family', option_d: 'physical', correct_answer: 'A', explanation: 'Trọng âm của "domestic" rơi vào âm tiết thứ 2. Các từ còn lại rơi vào âm tiết thứ nhất.' },
    { id: 5, exam_id: 1, question_order: 5, part: 'Grammar', question_text: 'The book ______ by my teacher last week was very interesting.', option_a: 'which wrote', option_b: 'writing', option_c: 'written', option_d: 'was written', correct_answer: 'C', explanation: 'Cấu trúc rút gọn mệnh đề quan hệ dạng bị động (past participle). Câu đầy đủ: "which was written by...".' },
    { id: 6, exam_id: 1, question_order: 6, part: 'Grammar', question_text: 'She is the ______ girl in our class.', option_a: 'beautifulest', option_b: 'more beautiful', option_c: 'most beautiful', option_d: 'as beautiful', correct_answer: 'C', explanation: 'So sánh nhất với tính từ dài: "the most + long adj".' },
    { id: 7, exam_id: 1, question_order: 7, part: 'Grammar', question_text: 'If I ______ a car, I would drive to school every day.', option_a: 'have', option_b: 'had', option_c: 'have had', option_d: 'will have', correct_answer: 'B', explanation: 'Câu điều kiện loại 2 (giả định ở hiện tại): If + S + V2/ed, S + would + V-bare.' },
    { id: 8, exam_id: 1, question_order: 8, part: 'Grammar', question_text: 'They have been living here ______ 10 years.', option_a: 'for', option_b: 'since', option_c: 'during', option_d: 'in', correct_answer: 'A', explanation: 'Dùng "for" trước một khoảng thời gian ("10 years") trong thì Hiện tại Hoàn thành.' },
    { id: 9, exam_id: 1, question_order: 9, part: 'Vocabulary', question_text: 'He had to ______ the meeting because he was feeling sick.', option_a: 'put off', option_b: 'go on', option_c: 'take after', option_d: 'turn up', correct_answer: 'A', explanation: 'Cụm động từ "put off" có nghĩa là trì hoãn, hoãn lại.' },
    { id: 10, exam_id: 1, question_order: 10, part: 'Vocabulary', question_text: 'Our family always divides the household ______ equally.', option_a: 'chores', option_b: 'jobs', option_c: 'duties', option_d: 'works', correct_answer: 'A', explanation: 'Cụm danh từ cố định "household chores" nghĩa là công việc nhà/việc vặt gia đình.' },
    { id: 11, exam_id: 1, question_order: 11, part: 'Vocabulary', question_text: 'The heavy rain caused severe ______ in the low-lying areas of the city.', option_a: 'flooding', option_b: 'drought', option_c: 'emission', option_d: 'biodiversity', correct_answer: 'A', explanation: 'Mưa lớn gây ra ngập lụt nghiêm trọng (flooding).' },
    { id: 12, exam_id: 1, question_order: 12, part: 'Vocabulary', question_text: 'The student made a ______ error on his test, which cost him the perfect score.', option_a: 'minor', option_b: 'grand', option_c: 'mammoth', option_d: 'huge', correct_answer: 'A', explanation: 'Từ phù hợp để mô tả lỗi nhỏ là "minor error".' },
    { id: 13, exam_id: 1, question_order: 13, part: 'Synonym', question_text: 'Choose the word CLOSEST in meaning to the underlined word:\nHe was **delighted** to receive the letter of acceptance.', option_a: 'sad', option_b: 'happy', option_c: 'scared', option_d: 'angry', correct_answer: 'B', explanation: '"delighted" nghĩa là rất vui mừng, đồng nghĩa với "happy".' },
    { id: 14, exam_id: 1, question_order: 14, part: 'Antonym', question_text: 'Choose the word OPPOSITE in meaning to the underlined word:\nIt is crucial to **conserve** water during dry seasons.', option_a: 'save', option_b: 'waste', option_c: 'protect', option_d: 'pollute', correct_answer: 'B', explanation: 'Trải nghĩa với "conserve" (tiết kiệm, bảo tồn) là "waste" (lãng phí).' },
    { id: 15, exam_id: 1, question_order: 15, part: 'Communication', question_text: 'John: "Would you like some tea?" - Mary: "______."', option_a: 'Yes, please', option_b: 'No, I don\'t', option_c: 'Thank you anyway', option_d: 'You are welcome', correct_answer: 'A', explanation: 'Cách trả lời lịch sự cho lời mời là "Yes, please" hoặc "No, thank you".' },
    { id: 16, exam_id: 1, question_order: 16, part: 'Reading', question_text: 'What is the main topic of the passage about climate change?', option_a: 'The history of solar power', option_b: 'The consequences of global warming', option_c: 'How to recycle plastic bottles', option_d: 'The benefits of planting trees', correct_answer: 'B', explanation: 'Theo mạch đề bài, ý chính bàn về hậu quả của sự nóng lên toàn cầu.' },
    { id: 17, exam_id: 1, question_order: 17, part: 'Reading', question_text: 'According to paragraph 2, what causes the rise of sea levels?', option_a: 'Volcanic eruptions', option_b: 'Melting glaciers and ice sheets', option_c: 'Heavy rainfall', option_d: 'Deep ocean currents', correct_answer: 'B', explanation: 'Hải băng tan (melting glaciers and ice sheets) là nguyên nhân chính khiến nước biển dâng.' },
    { id: 18, exam_id: 1, question_order: 18, part: 'Reading', question_text: 'The word "they" in line 5 refers to ______.', option_a: 'emissions', option_b: 'countries', option_c: 'scientists', option_d: 'temperatures', correct_answer: 'C', explanation: 'Đại từ "they" liên kết trực tiếp tới danh từ "scientists" được nói đến trước đó.' },
    { id: 19, exam_id: 1, question_order: 19, part: 'Reading', question_text: 'Which of the following is NOT true according to the text?', option_a: 'Glaciers are melting rapidly.', option_b: 'We should produce more greenhouse gases.', option_c: 'Carbon footprint can be reduced.', option_d: 'Climate change poses threats to biodiversity.', correct_answer: 'B', explanation: 'Việc khuyên tăng khí nhà kính là sai (Greenhouse gases là tác nhân gây hại).' },
    { id: 20, exam_id: 1, question_order: 20, part: 'Writing', question_text: 'Choose the correct sentence that combines: "He didn\'t study hard. He failed the final exam."', option_a: 'If he studied hard, he wouldn\'t fail.', option_b: 'If he had studied hard, he wouldn\'t have failed.', option_c: 'He failed the exam although he studied hard.', option_d: 'He passed the exam because he didn\'t study hard.', correct_answer: 'B', explanation: 'Câu điều kiện loại 3 dùng để diễn tả giả định ngược lại với thực tế trong quá khứ.' },
    // Questions for Exam 2 (HSG)
    { id: 21, exam_id: 2, question_order: 1, part: 'Lexico-Grammar', question_text: 'Such was her _______ that she was unable to speak.', option_a: 'frighten', option_b: 'fright', option_c: 'frightful', option_d: 'frightened', correct_answer: 'B', explanation: 'Sau tính từ sở hữu "her" cần một danh từ. "fright" là sự hoảng sợ, phù hợp cấu trúc đảo ngữ "Such was...".' },
    { id: 22, exam_id: 2, question_order: 2, part: 'Lexico-Grammar', question_text: 'He was absolute _______ with anger when he saw the damage to his car.', option_a: 'livid', option_b: 'warm', option_c: 'cool', option_d: 'content', correct_answer: 'A', explanation: '"livid with anger" là một collocation có nghĩa cực kỳ tức giận.' },
    { id: 23, exam_id: 2, question_order: 3, part: 'Lexico-Grammar', question_text: 'Rarely _______ so much enthusiasm from high school students.', option_a: 'do we see', option_b: 'we see', option_c: 'have we seen', option_d: 'we have seen', correct_answer: 'C', explanation: 'Cấu trúc đảo ngữ với trạng từ phủ định ở đầu câu "Rarely + auxiliary + S + V". Ở đây dùng Hiện tại Hoàn thành hợp lý nhất.' },
    { id: 24, exam_id: 2, question_order: 4, part: 'Lexico-Grammar', question_text: 'The company was forced to _______ its operations due to the economic crisis.', option_a: 'curtail', option_b: 'stretch', option_c: 'expand', option_d: 'elongate', correct_answer: 'A', explanation: '"curtail" có nghĩa là cắt bớt, giảm bớt chi tiêu/hoạt động, rất phù hợp bối cảnh suy thoái.' },
    { id: 25, exam_id: 2, question_order: 5, part: 'Lexico-Grammar', question_text: 'You should always check the _______ print before signing any contract.', option_a: 'small', option_b: 'fine', option_c: 'tiny', option_d: 'little', correct_answer: 'B', explanation: '"fine print" là thuật ngữ chỉ các điều khoản viết chữ nhỏ, dễ bị bỏ qua trong hợp đồng.' },
    { id: 26, exam_id: 2, question_order: 6, part: 'Lexico-Grammar', question_text: 'Against all odds, the doctors managed to pull him _______.', option_a: 'through', option_b: 'over', option_c: 'up', option_d: 'back', correct_answer: 'A', explanation: '"pull through" là một cụm động từ có nghĩa là bình phục sau cơn bạo bệnh hoặc vượt qua thử thách.' },
    { id: 27, exam_id: 2, question_order: 7, part: 'Lexico-Grammar', question_text: 'The newly elected government is promised to tackle _______ unemployment.', option_a: 'rife', option_b: 'rampant', option_c: 'abundant', option_d: 'excessive', correct_answer: 'B', explanation: '"rampant unemployment" là một collocation ý chỉ nạn thất nghiệp hoành hành dữ dội.' },
    { id: 28, exam_id: 2, question_order: 8, part: 'Lexico-Grammar', question_text: 'Had I known about the party, I _______ have come.', option_a: 'will', option_b: 'must', option_c: 'would', option_d: 'should', correct_answer: 'C', explanation: 'Đảo ngữ câu điều kiện loại 3: "Had + S + V3/ed, S + would have + V3/ed".' },
    { id: 29, exam_id: 2, question_order: 9, part: 'Vocabulary', question_text: 'He behaves like a child; he is completely _______.', option_a: 'immature', option_b: 'mature', option_c: 'premature', option_d: 'matured', correct_answer: 'A', explanation: 'Từ mang nghĩa "chưa trưởng thành, trẻ con" là "immature".' },
    { id: 30, exam_id: 2, question_order: 10, part: 'Vocabulary', question_text: 'There is no _______ evidence that the vaccine causes any side effects.', option_a: 'conclusive', option_b: 'inclusive', option_c: 'deciding', option_d: 'finalizing', correct_answer: 'A', explanation: '"conclusive evidence" có nghĩa là bằng chứng thuyết phục, rõ ràng, không thể chối cãi.' },
    { id: 31, exam_id: 2, question_order: 11, part: 'Cloze Test', question_text: 'In recent years, artificial intelligence has made _______ strides in medical fields. (Choose the best word)', option_a: 'giant', option_b: 'tall', option_c: 'high', option_d: 'wide', correct_answer: 'A', explanation: '"giant strides" là một collocation phổ biến chỉ bước tiến khổng lồ.' },
    { id: 32, exam_id: 2, question_order: 12, part: 'Cloze Test', question_text: 'Computers can analyze medical data at _______ speeds.', option_a: 'blinding', option_b: 'running', option_c: 'rushing', option_d: 'jumping', correct_answer: 'A', explanation: '"blinding speed" nghĩa là tốc độ cực kỳ nhanh chóng (nhanh mù mắt).' },
    { id: 33, exam_id: 2, question_order: 13, part: 'Cloze Test', question_text: 'This helps doctors make more _______ diagnoses.', option_a: 'accurate', option_b: 'faulty', option_c: 'wrong', option_d: 'quick', correct_answer: 'A', explanation: '"accurate diagnoses" nghĩa là chẩn đoán chính xác.' },
    { id: 34, exam_id: 2, question_order: 14, part: 'Reading', question_text: 'What is the author\'s attitude towards AI technology in medicine?', option_a: 'Skeptical', option_b: 'Optimistic', option_c: 'Hostile', option_d: 'Indifferent', correct_answer: 'B', explanation: 'Mạch văn ca ngợi các bước tiến khổng lồ và chẩn đoán chính xác cho thấy thái độ lạc quan (optimistic).' },
    { id: 35, exam_id: 2, question_order: 15, part: 'Reading', question_text: 'Which word is closest in meaning to "unprecedented" in paragraph 3?', option_a: 'never seen before', option_b: 'very common', option_c: 'highly unwanted', option_d: 'extremely expensive', correct_answer: 'A', explanation: '"unprecedented" nghĩa là chưa từng có tiền lệ, tức "never seen before".' }
  ],
  exam_results: [
    { id: 1, student_id: 2, exam_id: 1, answers: { 1: "C", 2: "D", 3: "C", 4: "A", 5: "C", 6: "C", 7: "B", 8: "A", 9: "A", 10: "A", 11: "A", 12: "A", 13: "B", 14: "B", 15: "A", 16: "B", 17: "B", 18: "C", 19: "B", 20: "B" }, score: 10.0, total_correct: 20, total_questions: 20, completed_at: new Date() },
    { id: 2, student_id: 3, exam_id: 1, answers: { 1: "C", 2: "D", 3: "C", 4: "A", 5: "C", 6: "C", 7: "B", 8: "A", 9: "A", 10: "A", 11: "A", 12: "B", 13: "B", 14: "B", 15: "A", 16: "B", 17: "B", 18: "C", 19: "A", 20: "B" }, score: 9.0, total_correct: 18, total_questions: 20, completed_at: new Date() },
    { id: 3, student_id: 4, exam_id: 1, answers: { 1: "A", 2: "D", 3: "C", 4: "A", 5: "C", 6: "C", 7: "B", 8: "A", 9: "A", 10: "A", 11: "A", 12: "B", 13: "B", 14: "B", 15: "A", 16: "B", 17: "B", 18: "C", 19: "A", 20: "A" }, score: 8.0, total_correct: 16, total_questions: 20, completed_at: new Date() }
  ],
  settings: [
    { key: 'ai_api_key', value: 'configured', updated_at: new Date() }
  ]
};

// Hàm đọc dữ liệu local từ file JSON
function loadLocalData() {
  try {
    // Tạo thư mục db nếu chưa tồn tại
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    let data;
    if (fs.existsSync(DB_FILE_PATH)) {
      const content = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      data = JSON.parse(content);
    } else {
      // Viết dữ liệu seed khởi tạo
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(INITIAL_SEED_DATA, null, 2), 'utf-8');
      data = JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
    }

    // Tự động di chuyển/cập nhật tài khoản giáo viên ID 1 về mặc định mới nếu cần
    const teacherUser = data.users.find(u => u.id === 1 || u.role === 'teacher');
    if (teacherUser) {
      let changed = false;
      if (teacherUser.email === 'teacher@demo.com') {
        teacherUser.email = 'teacher';
        changed = true;
      }
      if (teacherUser.password_hash === '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee' || teacherUser.password_hash === '$2a$10$r6SWeLhWpG3h7E5PizvD2OKt.i2gZshK/37E6gqZ/6K8.g0bHymhG') {
        teacherUser.password_hash = '$2b$10$L9CIaPdQYjmXpTS35VcmWOxx1yCRBqYNiPYR1okQ5aJriYWtML5xu'; // 1234567
        changed = true;
      }
      if (changed) {
        fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
      }
    }

    if (!data.game_results) {
      data.game_results = [];
    }

    return data;
  } catch (error) {
    console.error('Không thể load database local:', error);
    return JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
  }
}

// Hàm ghi dữ liệu local vào file JSON
function saveLocalData(data) {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Không thể lưu database local:', error);
  }
}

// Khởi tạo PostgreSQL Pool hoặc simulated DB Pool
let dbExecutor;

if (isProduction) {
  console.log('--- KHỞI TẠO KẾT NỐI POSTGRESQL (PRODUCTION) ---');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Cần thiết đối với Render DB
    }
  });

  pool.on('error', (err) => {
    console.error('Lỗi không mong muốn trên PostgreSQL pool nhàn rỗi:', err);
  });

  // Tự động khởi tạo schema nếu chưa có
  async function initSchema() {
    try {
      const checkTable = await pool.query("SELECT to_regclass('public.users') as table_exists");
      if (!checkTable.rows[0].table_exists) {
        console.log('--- KHÔNG TÌM THẤY BẢNG USERS, ĐANG TỰ ĐỘNG CHẠY SCHEMA.SQL ---');
        const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schema);
        console.log('--- ĐÃ TẠO DATABASE SCHEMA THÀNH CÔNG ---');
        
        // Seed default teacher
        await pool.query(`
          INSERT INTO users (full_name, email, password_hash, role) 
          VALUES ('Ms. Hien', 'teacher', '$2b$10$L9CIaPdQYjmXpTS35VcmWOxx1yCRBqYNiPYR1okQ5aJriYWtML5xu', 'teacher')
        `);
        console.log('--- ĐÃ TẠO TÀI KHOẢN GIÁO VIÊN MẶC ĐỊNH ---');
      } else {
        // Kiểm tra xem bảng game_results đã tồn tại chưa để tránh lỗi cho các db đã chạy trước đó
        const checkGameResults = await pool.query("SELECT to_regclass('public.game_results') as table_exists");
        if (!checkGameResults.rows[0].table_exists) {
          console.log('--- KHÔNG TÌM THẤY BẢNG GAME_RESULTS, ĐANG TỰ ĐỘNG TẠO ---');
          await pool.query(`
            CREATE TABLE IF NOT EXISTS game_results (
              id SERIAL PRIMARY KEY,
              student_id INT REFERENCES users(id) ON DELETE CASCADE,
              score INT NOT NULL,
              time_spent INT NOT NULL,
              game_type VARCHAR(50) DEFAULT 'unknown',
              created_at TIMESTAMP DEFAULT NOW()
            );
          `);
          console.log('--- ĐÃ TẠO BẢNG GAME_RESULTS THÀNH CÔNG ---');
        }

        // Nếu đã có bảng, chỉ đồng bộ thông tin giáo viên mặc định
        await pool.query(`
          UPDATE users 
          SET email = 'teacher', password_hash = '$2b$10$L9CIaPdQYjmXpTS35VcmWOxx1yCRBqYNiPYR1okQ5aJriYWtML5xu' 
          WHERE role = 'teacher' OR id = 1
        `);
        console.log('--- ĐÃ ĐỒNG BỘ TÀI KHOẢN GIÁO VIÊN MẶC ĐỊNH TRONG POSTGRESQL THÀNH CÔNG ---');
      }
    } catch (err) {
      console.error('Lỗi khi khởi tạo schema PostgreSQL:', err);
    }
  }
  
  initSchema();

  dbExecutor = {
    async query(text, params) {
      try {
        const start = Date.now();
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        // console.log('Đã thực thi câu lệnh SQL:', { text, duration, rows: res.rowCount });
        return res;
      } catch (error) {
        console.error('Lỗi truy vấn PostgreSQL:', error);
        throw error;
      }
    }
  };
} else {
  console.log('--- KHỞI TẠO MÔ PHỎNG DATABASE LOCAL (DEVELOPMENT) ---');
  // Thực hiện mô phỏng SQL đơn giản dựa trên dữ liệu JSON
  dbExecutor = {
    async query(text, params = []) {
      const data = loadLocalData();
      const queryStr = text.trim().replace(/\s+/g, ' ');
      
      // 1. SELECT * FROM users WHERE email = $1
      if (queryStr.match(/select\s+\*\s+from\s+users\s+where\s+email\s*=\s*\$1/i)) {
        const user = data.users.find(u => u.email.toLowerCase() === params[0].toLowerCase());
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
      }

      // 2. SELECT * FROM users WHERE id = $1
      if (queryStr.match(/select\s+\*\s+from\s+users\s+where\s+id\s*=\s*\$1/i)) {
        const user = data.users.find(u => u.id === Number(params[0]));
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
      }

      // 3. INSERT INTO users (full_name, email, password_hash, role, class_name) VALUES ($1, $2, $3, $4, $5) RETURNING *
      if (queryStr.match(/insert\s+into\s+users/i)) {
        const id = data.users.reduce((max, u) => u.id > max ? u.id : max, 0) + 1;
        const newUser = {
          id,
          full_name: params[0],
          email: params[1],
          password_hash: params[2],
          role: params[3],
          class_name: params[4] || null,
          created_at: new Date()
        };
        data.users.push(newUser);
        saveLocalData(data);
        return { rows: [newUser], rowCount: 1 };
      }

      // 3b. DELETE FROM users WHERE id = $1
      if (queryStr.match(/delete\s+from\s+users\s+where\s+id\s*=\s*\$1/i)) {
        const id = Number(params[0]);
        const initialLen = data.users.length;
        data.users = data.users.filter(u => u.id !== id);
        saveLocalData(data);
        return { rowCount: initialLen - data.users.length };
      }

      // 3c. UPDATE users SET class_name = $1 WHERE id = $2
      if (queryStr.match(/update\s+users\s+set\s+class_name\s*=\s*\$1\s+where\s+id\s*=\s*\$2/i)) {
        const className = params[0];
        const id = Number(params[1]);
        const idx = data.users.findIndex(u => u.id === id);
        if (idx !== -1) {
          data.users[idx].class_name = className;
          saveLocalData(data);
          return { rows: [data.users[idx]], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }

      // 3d. UPDATE users SET password_hash = $1 WHERE id = $2
      if (queryStr.match(/update\s+users\s+set\s+password_hash\s*=\s*\$1\s+where\s+id\s*=\s*\$2/i)) {
        const hash = params[0];
        const id = Number(params[1]);
        const idx = data.users.findIndex(u => u.id === id);
        if (idx !== -1) {
          data.users[idx].password_hash = hash;
          saveLocalData(data);
          return { rows: [data.users[idx]], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }

      // 3e. UPDATE users SET password_hash = $1 WHERE email = $2
      if (queryStr.match(/update\s+users\s+set\s+password_hash\s*=\s*\$1\s+where\s+email\s*=\s*\$2/i)) {
        const hash = params[0];
        const email = params[1];
        const idx = data.users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
        if (idx !== -1) {
          data.users[idx].password_hash = hash;
          saveLocalData(data);
          return { rows: [data.users[idx]], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }

      // 4. SELECT * FROM classes WHERE teacher_id = $1
      if (queryStr.match(/select\s+\*\s+from\s+classes\s+where\s+teacher_id\s*=\s*\$1/i)) {
        const filtered = data.classes.filter(c => c.teacher_id === Number(params[0]));
        return { rows: filtered, rowCount: filtered.length };
      }

      // 4b. SELECT * FROM classes WHERE id = $1 AND teacher_id = $2
      if (queryStr.match(/select\s+\*\s+from\s+classes\s+where\s+id\s*=\s*\$1\s+and\s+teacher_id\s*=\s*\$2/i)) {
        const c = data.classes.find(cls => cls.id === Number(params[0]) && cls.teacher_id === Number(params[1]));
        return { rows: c ? [c] : [], rowCount: c ? 1 : 0 };
      }

      // 4c. UPDATE users SET class_name = NULL WHERE role = 'student' AND class_name = $1
      if (queryStr.match(/update\s+users\s+set\s+class_name\s*=\s*null/i)) {
        const className = params[0];
        let count = 0;
        data.users.forEach(u => {
          if (u.role === 'student' && u.class_name === className) {
            u.class_name = null;
            count++;
          }
        });
        saveLocalData(data);
        return { rowCount: count };
      }

      // 4d. DELETE FROM classes WHERE id = $1
      if (queryStr.match(/delete\s+from\s+classes\s+where\s+id\s*=\s*\$1/i)) {
        const id = Number(params[0]);
        const initialLen = data.classes.length;
        data.classes = data.classes.filter(c => c.id !== id);
        saveLocalData(data);
        return { rowCount: initialLen - data.classes.length };
      }

      // 5. SELECT * FROM classes
      if (queryStr.match(/select\s+\*\s+from\s+classes/i)) {
        return { rows: data.classes, rowCount: data.classes.length };
      }

      // 6. INSERT INTO classes (name, teacher_id, school_year) VALUES ($1, $2, $3) RETURNING *
      if (queryStr.match(/insert\s+into\s+classes/i)) {
        const id = data.classes.reduce((max, c) => c.id > max ? c.id : max, 0) + 1;
        const newClass = {
          id,
          name: params[0],
          teacher_id: Number(params[1]),
          school_year: params[2]
        };
        data.classes.push(newClass);
        saveLocalData(data);
        return { rows: [newClass], rowCount: 1 };
      }

      // 7. SELECT * FROM users WHERE role = 'student' AND class_name = $1
      if (queryStr.match(/select\s+\*\s+from\s+users\s+where\s+role\s*=\s*'student'\s+and\s+class_name\s*=\s*\$1/i)) {
        const filtered = data.users.filter(u => u.role === 'student' && u.class_name === params[0]);
        return { rows: filtered, rowCount: filtered.length };
      }

      // 8. SELECT * FROM assignments WHERE class_id = $1 ORDER BY created_at DESC
      if (queryStr.match(/select\s+\*\s+from\s+assignments\s+where\s+class_id\s*=\s*\$1/i)) {
        const filtered = data.assignments.filter(a => a.class_id === Number(params[0]));
        return { rows: filtered, rowCount: filtered.length };
      }

      // 9. SELECT * FROM assignments
      if (queryStr.match(/select\s+\*\s+from\s+assignments/i)) {
        return { rows: data.assignments, rowCount: data.assignments.length };
      }

      // 10. INSERT INTO assignments
      if (queryStr.match(/insert\s+into\s+assignments/i)) {
        const id = data.assignments.reduce((max, a) => a.id > max ? a.id : max, 0) + 1;
        const newAssignment = {
          id,
          title: params[0],
          description: params[1],
          skill: params[2],
          class_id: Number(params[3]),
          teacher_id: Number(params[4]),
          deadline: params[5],
          status: params[6] || 'open',
          created_at: new Date()
        };
        data.assignments.push(newAssignment);
        saveLocalData(data);
        return { rows: [newAssignment], rowCount: 1 };
      }

      // 11. UPDATE assignments SET title = $1, description = $2, skill = $3, deadline = $4, status = $5 WHERE id = $6 RETURNING *
      if (queryStr.match(/update\s+assignments/i)) {
        const title = params[0];
        const description = params[1];
        const skill = params[2];
        const deadline = params[3];
        const status = params[4];
        const id = Number(params[5]);

        const idx = data.assignments.findIndex(a => a.id === id);
        if (idx !== -1) {
          data.assignments[idx].title = title;
          data.assignments[idx].description = description;
          data.assignments[idx].skill = skill;
          data.assignments[idx].deadline = deadline;
          data.assignments[idx].status = status;
          saveLocalData(data);
          return { rows: [data.assignments[idx]], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }

      // 12. DELETE FROM assignments WHERE id = $1
      if (queryStr.match(/delete\s+from\s+assignments\s+where\s+id\s*=\s*\$1/i)) {
        const id = Number(params[0]);
        const initialLen = data.assignments.length;
        data.assignments = data.assignments.filter(a => a.id !== id);
        saveLocalData(data);
        return { rowCount: initialLen - data.assignments.length };
      }

      // 12b. DELETE FROM scores WHERE assignment_id = $1
      if (queryStr.match(/delete\s+from\s+scores\s+where\s+assignment_id\s*=\s*\$1/i)) {
        const assignmentId = Number(params[0]);
        const initialLen = data.scores.length;
        data.scores = data.scores.filter(s => s.assignment_id !== assignmentId);
        saveLocalData(data);
        return { rowCount: initialLen - data.scores.length };
      }

      // 13. JOIN query for scores: s.*, u.full_name as student_name FROM scores s JOIN users u ... WHERE s.assignment_id = $1
      if (queryStr.match(/scores\s+s\s+join\s+users\s+u/i) && queryStr.match(/assignment_id\s*=\s*\$1/i)) {
        const assignmentId = Number(params[0]);
        const scores = data.scores.filter(s => s.assignment_id === assignmentId);
        const joined = scores.map(s => {
          const u = data.users.find(user => user.id === s.student_id);
          return {
            ...s,
            student_name: u ? u.full_name : 'Ẩn danh'
          };
        });
        return { rows: joined, rowCount: joined.length };
      }

      // 14. SELECT * FROM scores WHERE student_id = $1
      if (queryStr.match(/select\s+\*\s+from\s+scores\s+where\s+student_id\s*=\s*\$1/i)) {
        const filtered = data.scores.filter(s => s.student_id === Number(params[0]));
        return { rows: filtered, rowCount: filtered.length };
      }

      // 14b. JOIN query for scores of a student: s.id as score_id, s.score...
      if (queryStr.match(/scores\s+s\s+join\s+assignments\s+a/i) && queryStr.match(/student_id\s*=\s*\$1/i)) {
        const studentId = Number(params[0]);
        const scores = data.scores.filter(s => s.student_id === studentId);
        const joined = scores.map(s => {
          const a = data.assignments.find(assign => assign.id === s.assignment_id);
          const u = data.users.find(user => user.id === s.graded_by);
          return {
            score_id: s.id,
            score: s.score,
            note: s.note,
            graded_at: s.graded_at,
            assignment_title: a ? a.title : 'Bài tập đã bị xoá',
            skill: a ? a.skill : 'N/A',
            deadline: a ? a.deadline : null,
            teacher_name: u ? u.full_name : 'Giáo viên'
          };
        });
        // Sắp xếp theo graded_at giảm dần
        joined.sort((x, y) => new Date(y.graded_at) - new Date(x.graded_at));
        return { rows: joined, rowCount: joined.length };
      }

      // 15. INSERT INTO scores (student_id, assignment_id, score, note, graded_by) ... ON CONFLICT
      if (queryStr.match(/insert\s+into\s+scores/i)) {
        const studentId = Number(params[0]);
        const assignmentId = Number(params[1]);
        const scoreVal = Number(params[2]);
        const note = params[3];
        const gradedBy = Number(params[4]);

        const idx = data.scores.findIndex(s => s.student_id === studentId && s.assignment_id === assignmentId);
        if (idx !== -1) {
          data.scores[idx].score = scoreVal;
          data.scores[idx].note = note;
          data.scores[idx].graded_by = gradedBy;
          data.scores[idx].graded_at = new Date();
          saveLocalData(data);
          return { rows: [data.scores[idx]], rowCount: 1 };
        } else {
          const id = data.scores.reduce((max, s) => s.id > max ? s.id : max, 0) + 1;
          const newScore = {
            id,
            student_id: studentId,
            assignment_id: assignmentId,
            score: scoreVal,
            note,
            graded_by: gradedBy,
            graded_at: new Date()
          };
          data.scores.push(newScore);
          saveLocalData(data);
          return { rows: [newScore], rowCount: 1 };
        }
      }

      // 16. SELECT * FROM vocabulary ...
      if (queryStr.match(/select\s+\*\s+from\s+vocabulary/i)) {
        let filtered = [...data.vocabulary];
        // Vì truy vấn từ vựng có thể lọc động ở Route bằng JS, ta trả về toàn bộ và xử lý lọc ở route luôn, hoặc hỗ trợ lọc cơ bản
        return { rows: filtered, rowCount: filtered.length };
      }

      // 17. INSERT INTO vocabulary
      if (queryStr.match(/insert\s+into\s+vocabulary/i)) {
        const id = data.vocabulary.reduce((max, v) => v.id > max ? v.id : max, 0) + 1;
        const newVocab = {
          id,
          word: params[0],
          ipa: params[1],
          word_type: params[2],
          meaning_vi: params[3],
          example: params[4],
          topic: params[5],
          grade: params[6] ? Number(params[6]) : null,
          unit: params[7] || null,
          created_by: Number(params[8]),
          created_at: new Date()
        };
        data.vocabulary.push(newVocab);
        saveLocalData(data);
        return { rows: [newVocab], rowCount: 1 };
      }

      // 18. UPDATE vocabulary SET word = $1, ipa = $2, word_type = $3, meaning_vi = $4, example = $5, topic = $6, grade = $7, unit = $8 WHERE id = $9
      if (queryStr.match(/update\s+vocabulary/i)) {
        const id = Number(params[8]);
        const idx = data.vocabulary.findIndex(v => v.id === id);
        if (idx !== -1) {
          data.vocabulary[idx].word = params[0];
          data.vocabulary[idx].ipa = params[1];
          data.vocabulary[idx].word_type = params[2];
          data.vocabulary[idx].meaning_vi = params[3];
          data.vocabulary[idx].example = params[4];
          data.vocabulary[idx].topic = params[5];
          data.vocabulary[idx].grade = params[6] ? Number(params[6]) : null;
          data.vocabulary[idx].unit = params[7] || null;
          saveLocalData(data);
          return { rows: [data.vocabulary[idx]], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }

      // 19. DELETE FROM vocabulary WHERE id = $1
      if (queryStr.match(/delete\s+from\s+vocabulary\s+where\s+id\s*=\s*\$1/i)) {
        const id = Number(params[0]);
        const initialLen = data.vocabulary.length;
        data.vocabulary = data.vocabulary.filter(v => v.id !== id);
        saveLocalData(data);
        return { rowCount: initialLen - data.vocabulary.length };
      }

      // 20. SELECT * FROM exams WHERE id = $1
      if (queryStr.match(/select\s+\*\s+from\s+exams\s+where\s+id\s*=\s*\$1/i)) {
        const exam = data.exams.find(e => e.id === Number(params[0]));
        return { rows: exam ? [exam] : [], rowCount: exam ? 1 : 0 };
      }

      // 21. SELECT * FROM exams
      if (queryStr.match(/select\s+\*\s+from\s+exams/i)) {
        return { rows: data.exams, rowCount: data.exams.length };
      }

      // 22. INSERT INTO exams
      if (queryStr.match(/insert\s+into\s+exams/i)) {
        const id = data.exams.reduce((max, e) => e.id > max ? e.id : max, 0) + 1;
        const newExam = {
          id,
          title: params[0],
          exam_type: params[1],
          year: Number(params[2]),
          province: params[3],
          grade: Number(params[4]),
          duration_minutes: Number(params[5]),
          difficulty: params[6],
          is_ai_generated: params[7] === 'true' || params[7] === true,
          created_by: Number(params[8]),
          status: 'draft',
          created_at: new Date()
        };
        data.exams.push(newExam);
        saveLocalData(data);
        return { rows: [newExam], rowCount: 1 };
      }

      // 22b. UPDATE exams (title, grade, duration_minutes, status, etc.)
      if (queryStr.match(/update\s+exams/i)) {
        if (queryStr.includes('status = $1') && queryStr.includes('assigned_groups = $2')) {
          const status = params[0];
          const assigned_groups = params[1];
          const id = Number(params[2]);
          const idx = data.exams.findIndex(e => e.id === id);
          if (idx !== -1) {
            data.exams[idx].status = status;
            data.exams[idx].assigned_groups = assigned_groups;
            saveLocalData(data);
            return { rows: [data.exams[idx]], rowCount: 1 };
          }
        } else if (queryStr.includes('status = $1')) {
          const status = params[0];
          const id = Number(params[1]);
          const idx = data.exams.findIndex(e => e.id === id);
          if (idx !== -1) {
            data.exams[idx].status = status;
            saveLocalData(data);
            return { rows: [data.exams[idx]], rowCount: 1 };
          }
        } else {
          // UPDATE exams SET title = $1, grade = $2, duration_minutes = $3 WHERE id = $4
          const title = params[0];
          const grade = Number(params[1]);
          const duration = Number(params[2]);
          const id = Number(params[3]);
          const idx = data.exams.findIndex(e => e.id === id);
          if (idx !== -1) {
            data.exams[idx].title = title;
            data.exams[idx].grade = grade;
            data.exams[idx].duration_minutes = duration;
            saveLocalData(data);
            return { rows: [data.exams[idx]], rowCount: 1 };
          }
        }
        return { rows: [], rowCount: 0 };
      }

      // UPDATE exam_questions SET question_text = $1, option_a = $2, option_b = $3, option_c = $4, option_d = $5, correct_answer = $6, explanation = $7, part = $8 WHERE id = $9 RETURNING *
      if (queryStr.match(/update\s+exam_questions/i)) {
        const question_text = params[0];
        const option_a = params[1];
        const option_b = params[2];
        const option_c = params[3];
        const option_d = params[4];
        const correct_answer = params[5];
        const explanation = params[6];
        const part = params[7];
        const id = Number(params[8]);
        
        const idx = data.exam_questions.findIndex(q => q.id === id);
        if (idx !== -1) {
          data.exam_questions[idx].question_text = question_text;
          data.exam_questions[idx].option_a = option_a;
          data.exam_questions[idx].option_b = option_b;
          data.exam_questions[idx].option_c = option_c;
          data.exam_questions[idx].option_d = option_d;
          data.exam_questions[idx].correct_answer = correct_answer;
          data.exam_questions[idx].explanation = explanation;
          data.exam_questions[idx].part = part;
          saveLocalData(data);
          return { rows: [data.exam_questions[idx]], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }

      // DELETE FROM exam_questions WHERE exam_id = $1
      if (queryStr.match(/delete\s+from\s+exam_questions\s+where\s+exam_id\s*=\s*\$1/i)) {
        const examId = Number(params[0]);
        data.exam_questions = data.exam_questions.filter(q => q.exam_id !== examId);
        saveLocalData(data);
        return { rows: [], rowCount: 1 };
      }

      // DELETE FROM exam_results WHERE exam_id = $1
      if (queryStr.match(/delete\s+from\s+exam_results\s+where\s+exam_id\s*=\s*\$1/i)) {
        const examId = Number(params[0]);
        data.exam_results = data.exam_results.filter(r => r.exam_id !== examId);
        saveLocalData(data);
        return { rows: [], rowCount: 1 };
      }

      // DELETE FROM exams WHERE id = $1
      if (queryStr.match(/delete\s+from\s+exams\s+where\s+id\s*=\s*\$1/i)) {
        const id = Number(params[0]);
        const deleted = data.exams.filter(e => e.id === id);
        data.exams = data.exams.filter(e => e.id !== id);
        saveLocalData(data);
        return { rows: deleted, rowCount: deleted.length };
      }

      // 23. SELECT * FROM exam_questions WHERE exam_id = $1 ORDER BY question_order
      if (queryStr.match(/select\s+\*\s+from\s+exam_questions\s+where\s+exam_id\s*=\s*\$1/i)) {
        const filtered = data.exam_questions.filter(q => q.exam_id === Number(params[0])).sort((a, b) => a.question_order - b.question_order);
        return { rows: filtered, rowCount: filtered.length };
      }

      // 24. INSERT INTO exam_questions
      if (queryStr.match(/insert\s+into\s+exam_questions/i)) {
        const id = data.exam_questions.reduce((max, q) => q.id > max ? q.id : max, 0) + 1;
        const newQuestion = {
          id,
          exam_id: Number(params[0]),
          question_order: Number(params[1]),
          part: params[2],
          question_text: params[3],
          option_a: params[4],
          option_b: params[5],
          option_c: params[6],
          option_d: params[7],
          correct_answer: params[8],
          explanation: params[9],
          question_type: params[10] || 'multiple_choice'
        };
        data.exam_questions.push(newQuestion);
        saveLocalData(data);
        return { rows: [newQuestion], rowCount: 1 };
      }

      // 25. INSERT INTO exam_results
      if (queryStr.match(/insert\s+into\s+exam_results/i)) {
        const id = data.exam_results.reduce((max, r) => r.id > max ? r.id : max, 0) + 1;
        const newResult = {
          id,
          student_id: Number(params[0]),
          exam_id: Number(params[1]),
          answers: typeof params[2] === 'string' ? JSON.parse(params[2]) : params[2],
          score: Number(params[3]),
          total_correct: Number(params[4]),
          total_questions: Number(params[5]),
          seconds_spent: params[6] !== undefined ? Number(params[6]) : 0,
          completed_at: new Date()
        };
        data.exam_results.push(newResult);
        saveLocalData(data);
        return { rows: [newResult], rowCount: 1 };
      }

      // 26. JOIN query for results: r.*, e.title as exam_title, e.exam_type FROM exam_results r JOIN exams e WHERE r.student_id = $1
      if (queryStr.match(/exam_results\s+r\s+join\s+exams\s+e/i) && queryStr.match(/student_id\s*=\s*\$1/i)) {
        const studentId = Number(params[0]);
        const results = data.exam_results.filter(r => r.student_id === studentId);
        const joined = results.map(r => {
          const e = data.exams.find(exam => exam.id === r.exam_id);
          return {
            ...r,
            exam_title: e ? e.title : 'Đề thi đã bị xoá',
            exam_type: e ? e.exam_type : 'N/A'
          };
        });
        return { rows: joined, rowCount: joined.length };
      }

      // 27. JOIN query for results by exam: r.*, u.full_name as student_name FROM exam_results r JOIN users u WHERE r.exam_id = $1
      if (queryStr.match(/exam_results\s+r\s+join\s+users\s+u/i) && queryStr.match(/exam_id\s*=\s*\$1/i)) {
        const examId = Number(params[0]);
        const results = data.exam_results.filter(r => r.exam_id === examId);
        const joined = results.map(r => {
          const u = data.users.find(user => user.id === r.student_id);
          return {
            ...r,
            student_name: u ? u.full_name : 'Ẩn danh',
            class_name: u ? u.class_name : 'N/A',
            student_email: u ? u.email : 'N/A'
          };
        });
        return { rows: joined, rowCount: joined.length };
      }

      // 28. INSERT INTO game_results
      if (queryStr.match(/insert\s+into\s+game_results/i)) {
        if (!data.game_results) data.game_results = [];
        const id = data.game_results.reduce((max, g) => g.id > max ? g.id : max, 0) + 1;
        const newGameResult = {
          id,
          student_id: Number(params[0]),
          score: Number(params[1]),
          time_spent: Number(params[2]),
          game_type: params[3] || 'unknown',
          created_at: new Date()
        };
        data.game_results.push(newGameResult);
        saveLocalData(data);
        return { rows: [newGameResult], rowCount: 1 };
      }

      // 29. SELECT count(g.id) FROM game_results g JOIN users u
      if (queryStr.match(/game_results/i) && queryStr.match(/count\(g\.id\)/i)) {
        if (!data.game_results) data.game_results = [];
        const filterType = (queryStr.match(/game_type\s*=\s*\$1/i) && params && params.length > 0) ? params[0] : null;
        const counts = {};
        for (const g of data.game_results) {
          if (filterType && g.game_type !== filterType) continue;
          counts[g.student_id] = (counts[g.student_id] || 0) + 1;
        }
        const rows = Object.keys(counts).map(uid => {
          const u = data.users.find(user => Number(user.id) === Number(uid));
          return {
            full_name: u ? u.full_name : 'Học sinh ẩn danh',
            play_count: counts[uid]
          };
        }).sort((a, b) => b.play_count - a.play_count).slice(0, 5);

        return { rows, rowCount: rows.length };
      }

      // 30. SELECT g.score, g.time_spent FROM game_results g JOIN users u
      if (queryStr.match(/game_results/i) && queryStr.match(/order\s+by\s+g\.score/i)) {
        if (!data.game_results) data.game_results = [];
        const filterType = (queryStr.match(/game_type\s*=\s*\$1/i) && params && params.length > 0) ? params[0] : null;
        const filteredResults = filterType
          ? data.game_results.filter(g => g.game_type === filterType)
          : data.game_results;

        const rows = filteredResults.map(g => {
          const u = data.users.find(user => Number(user.id) === Number(g.student_id));
          return {
            full_name: u ? u.full_name : 'Học sinh ẩn danh',
            score: g.score,
            time_spent: g.time_spent,
            game_type: g.game_type
          };
        }).sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          return a.time_spent - b.time_spent;
        }).slice(0, 5);

        return { rows, rowCount: rows.length };
      }

      // Fallback mặc định cho các câu truy vấn khác (trả về mảng rỗng để không crash)
      console.warn('Mô phỏng chưa định nghĩa câu truy vấn này, trả về mảng rỗng:', queryStr);
      return { rows: [], rowCount: 0 };
    }
  };
}

export default dbExecutor;
