-- Mã hóa mật khẩu '1234567' bằng bcrypt: $2b$10$L9CIaPdQYjmXpTS35VcmWOxx1yCRBqYNiPYR1okQ5aJriYWtML5xu

-- 1. GIÁO VIÊN MẪU
INSERT INTO users (id, full_name, email, password_hash, role) VALUES 
(1, 'Ms. Hien', 'teacher', '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', 'teacher');

-- 2. HỌC SINH MẪU
-- Lớp 10A1
INSERT INTO users (id, full_name, email, password_hash, role, class_name) VALUES
(2, 'Nguyễn Văn An', 'hs1@10a1.com', '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', 'student', '10A1'),
(3, 'Trần Thị Bình', 'hs2@10a1.com', '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', 'student', '10A1'),
(4, 'Lê Hoàng Cường', 'hs3@10a1.com', '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', 'student', '10A1'),
(5, 'Phạm Hồng Duy', 'hs4@10a1.com', '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', 'student', '10A1'),
(6, 'Vũ Hải Yến', 'hs5@10a1.com', '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', 'student', '10A1');

-- Lớp 11B2
INSERT INTO users (id, full_name, email, password_hash, role, class_name) VALUES
(7, 'Hoàng Văn Dương', 'hs1@11b2.com', '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', 'student', '11B2'),
(8, 'Nguyễn Thanh Hà', 'hs2@11b2.com', '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', 'student', '11B2'),
(9, 'Trịnh Tiến Dũng', 'hs3@11b2.com', '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', 'student', '11B2'),
(10, 'Phan Văn Đức', 'hs4@11b2.com', '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', 'student', '11B2'),
(11, 'Đỗ Thùy Linh', 'hs5@11b2.com', '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', 'student', '11B2');

-- Lớp 12C3
INSERT INTO users (id, full_name, email, password_hash, role, class_name) VALUES
(12, 'Bùi Minh Quân', 'hs1@12c3.com', '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', 'student', '12C3'),
(13, 'Vũ Thùy Trang', 'hs2@12c3.com', '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', 'student', '12C3'),
(14, 'Đinh Gia Huy', 'hs3@12c3.com', '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', 'student', '12C3'),
(15, 'Nguyễn Thị Hương', 'hs4@12c3.com', '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', 'student', '12C3'),
(16, 'Lê Minh Triết', 'hs5@12c3.com', '$2b$10$6LYxQ2jqsQ04a.VBLgdCM.hM3rlE.ij3o1uhtmpFyGW/Wonrwxhee', 'student', '12C3');

-- 3. LỚP HỌC MẪU
INSERT INTO classes (id, name, teacher_id, school_year) VALUES
(1, '10A1', 1, '2025-2026'),
(2, '11B2', 1, '2025-2026'),
(3, '12C3', 1, '2025-2026');

-- 4. BÀI TẬP MẪU
INSERT INTO assignments (id, title, description, skill, class_id, teacher_id, deadline, status) VALUES
(1, 'Vocabulary Unit 1: Family Life', 'Học toàn bộ từ vựng Unit 1 và viết 5 câu ví dụ sử dụng các từ mới.', 'Vocabulary', 1, 1, '2026-07-10 23:59:59', 'open'),
(2, 'Grammar: Present Simple vs Present Continuous', 'Hoàn thành các bài tập chia động từ trong file đính kèm.', 'Grammar', 1, 1, '2026-07-15 23:59:59', 'open'),
(3, 'Reading Comprehension: Global Warming', 'Đọc đoạn văn và trả lời 10 câu hỏi trắc nghiệm.', 'Reading', 2, 1, '2026-07-08 23:59:59', 'open'),
(4, 'Writing: Essay on Technology benefits', 'Viết một bài luận ngắn (150-200 từ) nói về lợi ích của điện thoại thông minh.', 'Writing', 3, 1, '2026-07-05 23:59:59', 'open');

-- 5. ĐIỂM SỐ MẪU
INSERT INTO scores (student_id, assignment_id, score, note, graded_by) VALUES
(2, 1, 9.0, 'Bài làm rất tốt, đầy đủ ví dụ!', 1),
(3, 1, 8.5, 'Nộp bài đúng hạn, cần chú ý ngữ pháp.', 1),
(4, 1, 7.0, 'Thiếu 2 câu ví dụ.', 1),
(7, 3, 9.5, 'Excellent reading comprehension skills!', 1),
(8, 3, 6.5, 'Cần cố gắng nhiều hơn ở phần suy luận ý kiến.', 1);

-- 6. TỪ VỰNG MẪU (Lớp 10, 11, 12 & Theo Chủ Đề)
-- Grade 10 - Unit 1 Family Life (12 từ)
INSERT INTO vocabulary (word, ipa, word_type, meaning_vi, example, topic, grade, unit, created_by) VALUES
('homemaker', '/ˈhəʊmmeɪkə(r)/', 'n', 'Người nội trợ', 'My mother is a homemaker and takes care of our family.', 'Family Life', 10, 'Unit 1 Family Life', 1),
('breadwinner', '/ˈbredwɪnə(r)/', 'n', 'Trụ cột gia đình', 'In many families, both husband and wife are breadwinners.', 'Family Life', 10, 'Unit 1 Family Life', 1),
('chore', '/tʃɔː(r)/', 'n', 'Công việc vặt (trong nhà)', 'We divide the household chores equally in our family.', 'Family Life', 10, 'Unit 1 Family Life', 1),
('heavy lifting', '/ˌhevi ˈlɪftɪŋ/', 'n', 'Việc nặng nhọc', 'My brother always does the heavy lifting around the house.', 'Family Life', 10, 'Unit 1 Family Life', 1),
('household', '/ˈhaʊshəʊld/', 'n', 'Hộ gia đình', 'They are in charge of household finances.', 'Family Life', 10, 'Unit 1 Family Life', 1),
('rubbish', '/ˈrʌbɪʃ/', 'n', 'Rác thải', 'My duty is to take out the rubbish every evening.', 'Family Life', 10, 'Unit 1 Family Life', 1),
('divide', '/dɪˈvaɪd/', 'v', 'Chia sẻ, phân chia', 'We divide the house chores based on our school schedule.', 'Family Life', 10, 'Unit 1 Family Life', 1),
('nurture', '/ˈnɜːtʃə(r)/', 'v', 'Nuôi dưỡng', 'Mothers play an important role in nurturing children.', 'Family Life', 10, 'Unit 1 Family Life', 1),
('gratitude', '/ˈɡrætɪtjuːd/', 'n', 'Lòng biết ơn', 'We should express our gratitude to our parents.', 'Family Life', 10, 'Unit 1 Family Life', 1),
('bond', '/bɒnd/', 'n', 'Sự gắn kết', 'Eating dinners together helps strengthen the family bond.', 'Family Life', 10, 'Unit 1 Family Life', 1),
('benefit', '/ˈbenɪfɪt/', 'n', 'Lợi ích', 'There are many benefits to sharing household chores.', 'Family Life', 10, 'Unit 1 Family Life', 1),
('contribute', '/kənˈtrɪbjuːt/', 'v', 'Đóng góp', 'Each member contributes to making the house clean.', 'Family Life', 10, 'Unit 1 Family Life', 1);

-- Grade 10 - Unit 2 Humans and the Environment (12 từ)
INSERT INTO vocabulary (word, ipa, word_type, meaning_vi, example, topic, grade, unit, created_by) VALUES
('eco-friendly', '/ˌiːkəʊ ˈfrendli/', 'adj', 'Thân thiện với môi trường', 'We should use eco-friendly products to protect our planet.', 'Environment', 10, 'Unit 2 Humans and the Environment', 1),
('carbon footprint', '/ˌkɑːbən ˈfʊtprɪnt/', 'n', 'Dấu chân carbon', 'Riding a bicycle instead of driving helps reduce your carbon footprint.', 'Environment', 10, 'Unit 2 Humans and the Environment', 1),
('organic', '/ɔːˈɡænɪk/', 'adj', 'Hữu cơ', 'Organic food is healthy and good for the environment.', 'Environment', 10, 'Unit 2 Humans and the Environment', 1),
('renewable', '/rɪˈnjuːəbl/', 'adj', 'Có thể tái tạo', 'Solar and wind energy are sources of renewable energy.', 'Environment', 10, 'Unit 2 Humans and the Environment', 1),
('appliances', '/əˈplaɪənsɪz/', 'n', 'Thiết bị điện gia dụng', 'Remember to turn off all electrical appliances before leaving.', 'Environment', 10, 'Unit 2 Humans and the Environment', 1),
('litter', '/ˈlɪtə(r)/', 'v/n', 'Xả rác / Rác thải', 'Please do not litter in public parks.', 'Environment', 10, 'Unit 2 Humans and the Environment', 1),
('protect', '/prəˈtekt/', 'v', 'Bảo vệ', 'Governments must act to protect endangered species.', 'Environment', 10, 'Unit 2 Humans and the Environment', 1),
('conserve', '/kənˈsɜːv/', 'v', 'Bảo tồn, tiết kiệm', 'We need to conserve fresh water resources.', 'Environment', 10, 'Unit 2 Humans and the Environment', 1),
('pollute', '/pəˈluːt/', 'v', 'Gây ô nhiễm', 'Chemical waste from factories pollutes local rivers.', 'Environment', 10, 'Unit 2 Humans and the Environment', 1),
('clean-up', '/ˈkliːn ʌp/', 'n', 'Hoạt động dọn dẹp', 'Our class took part in a beach clean-up campaign last Sunday.', 'Environment', 10, 'Unit 2 Humans and the Environment', 1),
('sustainable', '/səˈsteɪnəbl/', 'adj', 'Bền vững', 'We need sustainable solutions to economic growth.', 'Environment', 10, 'Unit 2 Humans and the Environment', 1),
('recycle', '/ˌriːˈsaɪkl/', 'v', 'Tái chế', 'Paper, plastic and glass can be recycled easily.', 'Environment', 10, 'Unit 2 Humans and the Environment', 1);

-- Thêm một số từ cho Lớp 11 và 12 để đủ bộ
INSERT INTO vocabulary (word, ipa, word_type, meaning_vi, example, topic, grade, unit, created_by) VALUES
('generation gap', '/ˌdʒenəˈreɪʃn ɡæp/', 'n', 'Khoảng cách thế hệ', 'A generation gap can cause misunderstandings between parents and kids.', 'Relationships', 11, 'Unit 1 Generation Gap', 1),
('independent', '/ˌɪndɪˈpendənt/', 'adj', 'Độc lập, tự chủ', 'University students are encouraged to be more independent.', 'Life Skills', 11, 'Unit 2 Independent Life', 1),
('artificial intelligence', '/ˌɑːtɪfɪʃl ɪnˈtelɪdʒəns/', 'n', 'Trí tuệ nhân tạo (AI)', 'Artificial intelligence is changing the way we learn and work.', 'Technology', 12, 'Unit 1 AI Era', 1),
('lifelong learning', '/ˈlaɪflɒŋ ˈlɜːnɪŋ/', 'n', 'Học tập suốt đời', 'Lifelong learning is essential in a rapidly changing world.', 'Education', 12, 'Unit 2 Lifelong Learning', 1);

-- 7. CHỦ ĐỀ TỪ VỰNG PHỤ (Environment / Technology / Family / Science / Health) - 15 từ mỗi chủ đề tượng trưng
INSERT INTO vocabulary (word, ipa, word_type, meaning_vi, example, topic, created_by) VALUES
('biodiversity', '/ˌbaɪəʊdaɪˈvɜːsəti/', 'n', 'Đa dạng sinh học', 'The tropical rainforest has an extremely rich biodiversity.', 'Environment', 1),
('deforestation', '/ˌdiːˌfɒrɪˈsteɪʃn/', 'n', 'Sự phá rừng', 'Deforestation leads to global warming and loss of habitat.', 'Environment', 1),
('emission', '/iˈmɪʃn/', 'n', 'Khí thải', 'The government aims to cut carbon emissions to zero by 2050.', 'Environment', 1),
('innovation', '/ˌɪnəˈveɪʃn/', 'n', 'Sự đổi mới, sáng kiến', 'Technological innovation drives the modern economy.', 'Technology', 1),
('cyberspace', '/ˈsaɪbəspeɪs/', 'n', 'Không gian mạng', 'Parents should monitor what their kids are doing in cyberspace.', 'Technology', 1),
('ubiquitous', '/juːˈbɪkwɪtəs/', 'adj', 'Khắp mọi nơi, phổ biến', 'Mobile phones are ubiquitous in our daily lives.', 'Technology', 1),
('ancestor', '/ˈænsestə(r)/', 'n', 'Tổ tiên', 'Our ancestors came to this land hundreds of years ago.', 'Family', 1),
('heritage', '/ˈherɪtɪdʒ/', 'n', 'Di sản', 'We must preserve our traditional cultural heritage.', 'Family', 1),
('offspring', '/ˈɒfsprɪŋ/', 'n', 'Con cái, hậu duệ', 'Parents work hard to provide a better life for their offspring.', 'Family', 1),
('hypothesis', '/haɪˈpɒθəsɪs/', 'n', 'Giả thuyết', 'The researchers proposed a new hypothesis to explain the results.', 'Science', 1),
('laboratory', '/ləˈbɒrətri/', 'n', 'Phòng thí nghiệm', 'Students love doing science experiments in the chemistry laboratory.', 'Science', 1),
('breakthrough', '/ˈbreɪkθruː/', 'n', 'Sự đột phá', 'Scientists made a major breakthrough in cancer treatment.', 'Science', 1),
('nutrition', '/njuˈtrɪʃn/', 'n', 'Dinh dưỡng', 'Good nutrition is essential for a healthy body and mind.', 'Health', 1),
('immune system', '/ɪˈmjuːn ˌsɪstəm/', 'n', 'Hệ miễn dịch', 'Eating oranges can help boost your immune system.', 'Health', 1),
('sedentary', '/ˈsedntri/', 'adj', 'Thụ động, ít vận động', 'A sedentary lifestyle can lead to various health issues.', 'Health', 1);

-- 8. ĐỀ THI MẪU 1: ĐỀ THI THPT QUỐC GIA 2024 (20 câu trắc nghiệm)
INSERT INTO exams (id, title, exam_type, year, province, grade, duration_minutes, difficulty, is_ai_generated, created_by) VALUES
(1, 'Đề thi Tham khảo THPT Quốc Gia môn Tiếng Anh - 2024 (Rút Gọn)', 'thpt_qg', 2024, 'Bộ Giáo Dục', 12, 60, 'medium', false, 1);

-- Các câu hỏi cho đề thi THPT QG
INSERT INTO exam_questions (exam_id, question_order, part, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(1, 1, 'Pronunciation', 'Choose the word whose underlined part differs from the other three in pronunciation:\n**A**. play__ed__  **B**. plann__ed__  **C**. decid__ed__  **D**. liv__ed__', 'played', 'planned', 'decided', 'lived', 'C', 'Đuôi -ed của "decided" phát âm là /ɪd/ vì tận cùng là "d". Ba từ còn lại phát âm là /d/.'),
(1, 2, 'Pronunciation', 'Choose the word whose underlined part differs from the other three in pronunciation:\n**A**. l__i__ght  **B**. f__i__ne  **C**. m__i__nd  **D**. f__i__t', 'light', 'fine', 'mind', 'fit', 'D', 'Từ "fit" có nguyên âm /ɪ/, ba từ còn lại có nguyên âm đôi /aɪ/.'),
(1, 3, 'Stress', 'Choose the word that differs from the other three in the position of primary stress:\n**A**. teacher  **B**. student  **C**. explore  **D**. table', 'teacher', 'student', 'explore', 'table', 'C', 'Từ "explore" có trọng âm rơi vào âm tiết thứ 2. Ba từ còn lại có trọng âm rơi vào âm tiết thứ nhất.'),
(1, 4, 'Stress', 'Choose the word that differs from the other three in the position of primary stress:\n**A**. domestic  **B**. beautiful  **C**. family  **D**. physical', 'domestic', 'beautiful', 'family', 'physical', 'A', 'Trọng âm của "domestic" rơi vào âm tiết thứ 2. Các từ còn lại rơi vào âm tiết thứ nhất.'),
(1, 5, 'Grammar', 'The book ______ by my teacher last week was very interesting.', 'which wrote', 'writing', 'written', 'was written', 'C', 'Cấu trúc rút gọn mệnh đề quan hệ dạng bị động (past participle). Câu đầy đủ: "which was written by...".'),
(1, 6, 'Grammar', 'She is the ______ girl in our class.', 'beautifulest', 'more beautiful', 'most beautiful', 'as beautiful', 'C', 'So sánh nhất với tính từ dài: "the most + long adj".'),
(1, 7, 'Grammar', 'If I ______ a car, I would drive to school every day.', 'have', 'had', 'have had', 'will have', 'B', 'Câu điều kiện loại 2 (giả định ở hiện tại): If + S + V2/ed, S + would + V-bare.'),
(1, 8, 'Grammar', 'They have been living here ______ 10 years.', 'for', 'since', 'during', 'in', 'A', 'Dùng "for" trước một khoảng thời gian ("10 years") trong thì Hiện tại Hoàn thành.'),
(1, 9, 'Vocabulary', 'He had to ______ the meeting because he was feeling sick.', 'put off', 'go on', 'take after', 'turn up', 'A', 'Cụm động từ "put off" có nghĩa là trì hoãn, hoãn lại.'),
(1, 10, 'Vocabulary', 'Our family always divides the household ______ equally.', 'chores', 'jobs', 'duties', 'works', 'A', 'Cụm danh từ cố định "household chores" nghĩa là công việc nhà/việc vặt gia đình.'),
(1, 11, 'Vocabulary', 'The heavy rain caused severe ______ in the low-lying areas of the city.', 'flooding', 'drought', 'emission', 'biodiversity', 'A', 'Mưa lớn gây ra ngập lụt nghiêm trọng (flooding).'),
(1, 12, 'Vocabulary', 'The student made a ______ error on his test, which cost him the perfect score.', 'minor', 'grand', 'mammoth', 'huge', 'A', 'Từ phù hợp để mô tả lỗi nhỏ là "minor error".'),
(1, 13, 'Synonym', 'Choose the word CLOSEST in meaning to the underlined word:\nHe was **delighted** to receive the letter of acceptance.', 'sad', 'happy', 'scared', 'angry', 'B', '"delighted" nghĩa là rất vui mừng, đồng nghĩa với "happy".'),
(1, 14, 'Antonym', 'Choose the word OPPOSITE in meaning to the underlined word:\nIt is crucial to **conserve** water during dry seasons.', 'save', 'waste', 'protect', 'pollute', 'B', 'Trái nghĩa với "conserve" (tiết kiệm, bảo tồn) là "waste" (lãng phí).'),
(1, 15, 'Communication', 'John: "Would you like some tea?" - Mary: "______."', 'Yes, please', 'No, I don''t', 'Thank you anyway', 'You are welcome', 'A', 'Cách trả lời lịch sự cho lời mời là "Yes, please" hoặc "No, thank you".'),
(1, 16, 'Reading', 'What is the main topic of the passage about climate change?', 'The history of solar power', 'The consequences of global warming', 'How to recycle plastic bottles', 'The benefits of planting trees', 'B', 'Theo mạch đề bài, ý chính bàn về hậu quả của sự nóng lên toàn cầu.'),
(1, 17, 'Reading', 'According to paragraph 2, what causes the rise of sea levels?', 'Volcanic eruptions', 'Melting glaciers and ice sheets', 'Heavy rainfall', 'Deep ocean currents', 'B', 'Hải băng tan (melting glaciers and ice sheets) là nguyên nhân chính khiến nước biển dâng.'),
(1, 18, 'Reading', 'The word "they" in line 5 refers to ______.', 'emissions', 'countries', 'scientists', 'temperatures', 'C', 'Đại từ "they" liên kết trực tiếp tới danh từ "scientists" được nói đến trước đó.'),
(1, 19, 'Reading', 'Which of the following is NOT true according to the text?', 'Glaciers are melting rapidly.', 'We should produce more greenhouse gases.', 'Carbon footprint can be reduced.', 'Climate change poses threats to biodiversity.', 'B', 'Việc khuyên tăng khí nhà kính là sai (Greenhouse gases là tác nhân gây hại).'),
(1, 20, 'Writing', 'Choose the correct sentence that combines: "He didn''t study hard. He failed the final exam."', 'If he studied hard, he wouldn''t fail.', 'If he had studied hard, he wouldn''t have failed.', 'He failed the exam although he studied hard.', 'He passed the exam because he didn''t study hard.', 'B', 'Câu điều kiện loại 3 dùng để diễn tả giả định ngược lại với thực tế trong quá khứ.'),

-- 9. ĐỀ THI MẪU 2: ĐỀ THI HỌC SINH GIỎI TRƯỜNG 2024 (15 câu trắc nghiệm & điền từ)
(2, 'Đề thi Học Sinh Giỏi cấp Trường môn Tiếng Anh lớp 11 - 2024 (Rút Gọn)', 'hsg_truong', 2024, 'THPT Chu Văn An', 11, 45, 'hard', false, 1);

-- Các câu hỏi cho đề thi HSG
INSERT INTO exam_questions (exam_id, question_order, part, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(2, 1, 'Lexico-Grammar', 'Such was her _______ that she was unable to speak.', 'frighten', 'fright', 'frightful', 'frightened', 'B', 'Sau tính từ sở hữu "her" cần một danh từ. "fright" là sự hoảng sợ, phù hợp cấu trúc đảo ngữ "Such was...".'),
(2, 2, 'Lexico-Grammar', 'He was absolute _______ with anger when he saw the damage to his car.', 'livid', 'warm', 'cool', 'content', 'A', '"livid with anger" là một collocation có nghĩa cực kỳ tức giận.'),
(2, 3, 'Lexico-Grammar', 'Rarely _______ so much enthusiasm from high school students.', 'do we see', 'we see', 'have we seen', 'we have seen', 'C', 'Cấu trúc đảo ngữ với trạng từ phủ định ở đầu câu "Rarely + auxiliary + S + V". Ở đây dùng Hiện tại Hoàn thành hợp lý nhất.'),
(2, 4, 'Lexico-Grammar', 'The company was forced to _______ its operations due to the economic crisis.', 'curtail', 'stretch', 'expand', 'elongate', 'A', '"curtail" có nghĩa là cắt bớt, giảm bớt chi tiêu/hoạt động, rất phù hợp bối cảnh suy thoái.'),
(2, 5, 'Lexico-Grammar', 'You should always check the _______ print before signing any contract.', 'small', 'fine', 'tiny', 'little', 'B', '"fine print" là thuật ngữ chỉ các điều khoản viết chữ nhỏ, dễ bị bỏ qua trong hợp đồng.'),
(2, 6, 'Lexico-Grammar', 'Against all odds, the doctors managed to pull him _______.', 'through', 'over', 'up', 'back', 'A', '"pull through" là một cụm động từ có nghĩa là bình phục sau cơn bạo bệnh hoặc vượt qua thử thách.'),
(2, 7, 'Lexico-Grammar', 'The newly elected government is promised to tackle _______ unemployment.', 'rife', 'rampant', 'abundant', 'excessive', 'B', '"rampant unemployment" là một collocation ý chỉ nạn thất nghiệp hoành hành dữ dội.'),
(2, 8, 'Lexico-Grammar', 'Had I known about the party, I _______ have come.', 'will', 'must', 'would', 'should', 'C', 'Đảo ngữ câu điều kiện loại 3: "Had + S + V3/ed, S + would have + V3/ed".'),
(2, 9, 'Vocabulary', 'He behaves like a child; he is completely _______.', 'immature', 'mature', 'premature', 'matured', 'A', 'Từ mang nghĩa "chưa trưởng thành, trẻ con" là "immature".'),
(2, 10, 'Vocabulary', 'There is no _______ evidence that the vaccine causes any side effects.', 'conclusive', 'inclusive', 'deciding', 'finalizing', 'A', '"conclusive evidence" có nghĩa là bằng chứng thuyết phục, rõ ràng, không thể chối cãi.'),
(2, 11, 'Cloze Test', 'In recent years, artificial intelligence has made _______ strides in medical fields. (Choose the best word)', 'giant', 'tall', 'high', 'wide', 'A', '"giant strides" là một collocation phổ biến chỉ bước tiến khổng lồ.'),
(2, 12, 'Cloze Test', 'Computers can analyze medical data at _______ speeds.', 'blinding', 'running', 'rushing', 'jumping', 'A', '"blinding speed" nghĩa là tốc độ cực kỳ nhanh chóng (nhanh mù mắt).'),
(2, 13, 'Cloze Test', 'This helps doctors make more _______ diagnoses.', 'accurate', 'faulty', 'wrong', 'quick', 'A', '"accurate diagnoses" nghĩa là chẩn đoán chính xác.'),
(2, 14, 'Reading', 'What is the author''s attitude towards AI technology in medicine?', 'Skeptical', 'Optimistic', 'Hostile', 'Indifferent', 'B', 'Mạch văn ca ngợi các bước tiến khổng lồ và chẩn đoán chính xác cho thấy thái độ lạc quan (optimistic).'),
(2, 15, 'Reading', 'Which word is closest in meaning to "unprecedented" in paragraph 3?', 'never seen before', 'very common', 'highly unwanted', 'extremely expensive', 'A', '"unprecedented" nghĩa là chưa từng có tiền lệ, tức "never seen before".');

-- 10. KẾT QUẢ THI MẪU CỦA HỌC SINH
INSERT INTO exam_results (student_id, exam_id, answers, score, total_correct, total_questions) VALUES
(2, 1, '{"1":"C","2":"D","3":"C","4":"A","5":"C","6":"C","7":"B","8":"A","9":"A","10":"A","11":"A","12":"A","13":"B","14":"B","15":"A","16":"B","17":"B","18":"C","19":"B","20":"B"}', 10.0, 20, 20),
(3, 1, '{"1":"C","2":"D","3":"C","4":"A","5":"C","6":"C","7":"B","8":"A","9":"A","10":"A","11":"A","12":"B","13":"B","14":"B","15":"A","16":"B","17":"B","18":"C","19":"A","20":"B"}', 9.0, 18, 20),
(4, 1, '{"1":"A","2":"D","3":"C","4":"A","5":"C","6":"C","7":"B","8":"A","9":"A","10":"A","11":"A","12":"B","13":"B","14":"B","15":"A","16":"B","17":"B","18":"C","19":"A","20":"A"}', 8.0, 16, 20);
