-- Người dùng (giáo viên + học sinh)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('teacher', 'student')),
  class_name VARCHAR(20),        -- HS thuộc lớp nào (vd: 10A1)
  created_at TIMESTAMP DEFAULT NOW()
);

-- Lớp học
CREATE TABLE classes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(20) UNIQUE NOT NULL,   -- 10A1, 11B2, 12C3
  teacher_id INT REFERENCES users(id),
  school_year VARCHAR(20)
);

-- Bài tập
CREATE TABLE assignments (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  skill VARCHAR(50),   -- Reading/Writing/Grammar/Vocabulary/Listening
  class_id INT REFERENCES classes(id),
  teacher_id INT REFERENCES users(id),
  deadline TIMESTAMP,
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Điểm số
CREATE TABLE scores (
  id SERIAL PRIMARY KEY,
  student_id INT REFERENCES users(id),
  assignment_id INT REFERENCES assignments(id),
  score DECIMAL(4,2),
  note TEXT,
  graded_by INT REFERENCES users(id),
  graded_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, assignment_id)
);

-- Từ vựng
CREATE TABLE vocabulary (
  id SERIAL PRIMARY KEY,
  word VARCHAR(100) NOT NULL,
  ipa VARCHAR(100),
  word_type VARCHAR(20),   -- n, v, adj, adv
  meaning_vi TEXT,
  example TEXT,
  topic VARCHAR(100),      -- Environment / Technology...
  grade INT,               -- 10, 11, 12 (null = theo chủ đề)
  unit VARCHAR(100),       -- Unit 1 Family Life...
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Đề thi
CREATE TABLE exams (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  exam_type VARCHAR(50),   -- 'thpt_qg' | 'hsg_truong' | 'hsg_tinh' | 'hsg_quocgia'
  year INT,
  province VARCHAR(100),
  grade INT,
  duration_minutes INT,
  difficulty VARCHAR(20),  -- basic/medium/hard/mixed
  is_ai_generated BOOLEAN DEFAULT FALSE,
  assigned_groups JSONB,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Câu hỏi của đề thi
CREATE TABLE exam_questions (
  id SERIAL PRIMARY KEY,
  exam_id INT REFERENCES exams(id) ON DELETE CASCADE,
  question_order INT,
  part VARCHAR(100),       -- Grammar, Reading, Writing...
  question_text TEXT NOT NULL,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  correct_answer CHAR(1),  -- A/B/C/D
  explanation TEXT,
  question_type VARCHAR(30) DEFAULT 'multiple_choice'
);

-- Kết quả làm bài của học sinh
CREATE TABLE exam_results (
  id SERIAL PRIMARY KEY,
  student_id INT REFERENCES users(id),
  exam_id INT REFERENCES exams(id),
  answers JSONB,           -- {"1":"A","2":"C",...}
  score DECIMAL(4,2),
  total_correct INT,
  total_questions INT,
  seconds_spent INT DEFAULT 0,
  completed_at TIMESTAMP DEFAULT NOW()
);

-- Hỏi đáp với cô Hiền
CREATE TABLE student_questions (
  id SERIAL PRIMARY KEY,
  student_id INT REFERENCES users(id),
  question_text TEXT NOT NULL,
  ai_answer TEXT,
  teacher_answer TEXT,
  answered_by_teacher_id INT REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending', -- pending, ai_answered, teacher_answered
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cài đặt hệ thống (lưu API key AI, v.v.)
CREATE TABLE settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);
