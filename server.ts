import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";

const db = new Database("quality.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'AGENT'
  );

  CREATE TABLE IF NOT EXISTS monitoring_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_details TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    registration_date TEXT NOT NULL,
    call_date TEXT NOT NULL,
    creator_email TEXT NOT NULL,
    coordinator TEXT,
    monitoring_id TEXT,
    service_level TEXT,
    attachment_name TEXT,
    attachment_data TEXT,
    end_user_error TEXT,
    business_critical_error TEXT,
    compliance_error TEXT,
    non_critical_error TEXT,
    supervisor_feedback TEXT,
    feedback_date TEXT,
    feedback_signature TEXT,
    agent_commitment TEXT,
    commitment_date TEXT,
    commitment_signature TEXT,
    status TEXT DEFAULT 'PENDING_FEEDBACK'
  )
`);

// Migration: Add columns if they don't exist
try {
  db.prepare("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'AGENT'").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE monitoring_records ADD COLUMN attachment_name TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE monitoring_records ADD COLUMN attachment_data TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE monitoring_records ADD COLUMN service_level TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE monitoring_records ADD COLUMN creator_email TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE monitoring_records ADD COLUMN feedback_signature TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE monitoring_records ADD COLUMN commitment_signature TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE monitoring_records ADD COLUMN non_critical_error TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE monitoring_records ADD COLUMN coordinator TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE monitoring_records ADD COLUMN monitoring_id TEXT").run();
} catch (e) {}

// Migration: Add columns if they don't exist
try {
  db.prepare("ALTER TABLE monitoring_records ADD COLUMN feedback_date TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE monitoring_records ADD COLUMN commitment_date TEXT").run();
} catch (e) {}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, role } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.prepare("INSERT INTO users (email, password, role) VALUES (?, ?, ?)").run(email, hashedPassword, role || 'AGENT');
      res.json({ success: true });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        res.status(400).json({ error: "El usuario ya existe" });
      } else {
        res.status(500).json({ error: "Error al registrar usuario" });
      }
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    
    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    res.json({ success: true, email: user.email, role: user.role });
  });

  // API Routes
  app.get("/api/records", (req, res) => {
    const records = db.prepare("SELECT * FROM monitoring_records ORDER BY id DESC").all();
    res.json(records);
  });

  app.post("/api/records", (req, res) => {
    const { 
      call_details, 
      agent_name, 
      registration_date, 
      call_date, 
      creator_email,
      coordinator,
      monitoring_id,
      service_level,
      attachment_name,
      attachment_data,
      end_user_error, 
      business_critical_error, 
      compliance_error,
      non_critical_error
    } = req.body;

    const info = db.prepare(`
      INSERT INTO monitoring_records (
        call_details, agent_name, registration_date, call_date, creator_email,
        coordinator, monitoring_id, service_level, attachment_name, attachment_data, end_user_error, business_critical_error, compliance_error, non_critical_error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      call_details, agent_name, registration_date, call_date, creator_email,
      coordinator, monitoring_id, service_level, attachment_name, attachment_data, end_user_error, business_critical_error, compliance_error, non_critical_error
    );

    res.json({ id: info.lastInsertRowid });
  });

  app.patch("/api/records/:id/feedback", (req, res) => {
    const { id } = req.params;
    const { supervisor_feedback, feedback_signature } = req.body;
    const feedback_date = new Date().toISOString().split('T')[0];
    
    db.prepare("UPDATE monitoring_records SET supervisor_feedback = ?, feedback_date = ?, feedback_signature = ?, status = 'PENDING_COMMITMENT' WHERE id = ?")
      .run(supervisor_feedback, feedback_date, feedback_signature, id);
    
    res.json({ success: true });
  });

  app.patch("/api/records/:id/commitment", (req, res) => {
    const { id } = req.params;
    const { agent_commitment, commitment_signature } = req.body;
    const commitment_date = new Date().toISOString().split('T')[0];
    
    db.prepare("UPDATE monitoring_records SET agent_commitment = ?, commitment_date = ?, commitment_signature = ?, status = 'COMPLETED' WHERE id = ?")
      .run(agent_commitment, commitment_date, commitment_signature, id);
    
    res.json({ success: true });
  });

  app.delete("/api/records/:id", (req, res) => {
    const id = Number(req.params.id);
    const record = db.prepare("SELECT status FROM monitoring_records WHERE id = ?").get(id) as any;
    
    if (!record) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }

    if (record.status !== 'PENDING_FEEDBACK') {
      return res.status(400).json({ error: "Solo se pueden eliminar registros en estado Pendiente de Feedback" });
    }

    db.prepare("DELETE FROM monitoring_records WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.put("/api/records/:id", (req, res) => {
    const { id } = req.params;
    const { 
      call_details, 
      agent_name, 
      call_date, 
      coordinator,
      monitoring_id,
      service_level,
      attachment_name,
      attachment_data,
      end_user_error, 
      business_critical_error, 
      compliance_error,
      non_critical_error 
    } = req.body;

    const record = db.prepare("SELECT status FROM monitoring_records WHERE id = ?").get(id) as any;
    if (!record) return res.status(404).json({ error: "Registro no encontrado" });
    if (record.status !== 'PENDING_FEEDBACK') return res.status(400).json({ error: "Solo se pueden editar registros en estado Pendiente de Feedback" });

    db.prepare(`
      UPDATE monitoring_records SET 
        call_details = ?, 
        agent_name = ?, 
        call_date = ?, 
        coordinator = ?,
        monitoring_id = ?,
        service_level = ?,
        attachment_name = ?,
        attachment_data = ?,
        end_user_error = ?, 
        business_critical_error = ?, 
        compliance_error = ?, 
        non_critical_error = ?
      WHERE id = ?
    `).run(
      call_details, 
      agent_name, 
      call_date, 
      coordinator,
      monitoring_id,
      service_level,
      attachment_name,
      attachment_data,
      end_user_error, 
      business_critical_error, 
      compliance_error, 
      non_critical_error,
      id
    );

    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
